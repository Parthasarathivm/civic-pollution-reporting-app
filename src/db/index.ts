import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const globalForDb = globalThis as typeof globalThis & {
  __civicPulsePgliteClient?: PGlite;
  __civicPulseDrizzleDb?: ReturnType<typeof drizzle<typeof schema>>;
  __civicPulseInitPromise?: Promise<void>;
};

function getStoragePaths() {
  const dataDir = path.join(process.cwd(), ".civicpulse_data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const snapshotPath = path.join(dataDir, "db.tar");
  return { dataDir, snapshotPath };
}

function createClient(): PGlite {
  const { snapshotPath } = getStoragePaths();
  if (fs.existsSync(snapshotPath)) {
    try {
      const buffer = fs.readFileSync(snapshotPath);
      return new PGlite({ loadDataDir: new Blob([buffer]) });
    } catch (e) {
      console.warn("Could not load database snapshot, starting fresh:", e);
    }
  }
  return new PGlite();
}

export const client: PGlite =
  globalForDb.__civicPulsePgliteClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__civicPulsePgliteClient = client;
}

export const db =
  globalForDb.__civicPulseDrizzleDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__civicPulseDrizzleDb = db;
}

// Background auto-persistence whenever data changes
let saveTimeout: NodeJS.Timeout | null = null;
export function triggerDbPersistence() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const { snapshotPath } = getStoragePaths();
      const blob = await client.dumpDataDir();
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(snapshotPath, buffer);
    } catch (err) {
      console.error("Failed to persist database snapshot:", err);
    }
  }, 1000);
}

// Ensure tables and demo data are initialized
async function initializeSchemaAndSeed() {
  await client.waitReady;

  try {
    // 1. Initial base migration if needed
    const checkRes = await client.query<{ exists: string | null }>(
      "SELECT to_regclass('public.users') as exists;"
    );

    if (!checkRes.rows[0]?.exists) {
      const sqlFilePath = path.join(process.cwd(), "drizzle", "0000_dear_ego.sql");
      if (fs.existsSync(sqlFilePath)) {
        const sql = fs.readFileSync(sqlFilePath, "utf8");
        const statements = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements) {
          await client.exec(stmt);
        }
      }
    }

    // 2. Upgrade migration (CivicPulse expansion)
    const upgradeSqlPath = path.join(process.cwd(), "drizzle", "0001_civicpulse_upgrade.sql");
    if (fs.existsSync(upgradeSqlPath)) {
      const sql = fs.readFileSync(upgradeSqlPath, "utf8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        try {
          await client.exec(stmt);
        } catch (e) {
          // Statements might already exist in snapshot, ignore duplicate column/table errors
        }
      }
    }

    // 3. Seed Wards if none exist
    const wardsCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM wards;");
    if (parseInt(wardsCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO wards (name, population_density, city) VALUES
        ('Ward 1 - Central Connaught', 25000, 'Demo City'),
        ('Ward 2 - North Riverfront', 18000, 'Demo City'),
        ('Ward 3 - South Residential', 32000, 'Demo City'),
        ('Ward 4 - East Industrial Hub', 12000, 'Demo City'),
        ('Ward 5 - West Commercial Gate', 28000, 'Demo City');
      `);
    }

    // 4. Seed Departments if none exist
    const deptsCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM departments;");
    if (parseInt(deptsCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO departments (name, code, description, contact_email) VALUES
        ('Municipal Solid Waste Dept', 'WMD', 'City-wide collection, hazardous dumping, and community segregation enforcement', 'waste.ops@cleanair.demo'),
        ('Air Quality & Emissions Bureau', 'AQB', 'Continuous ambient air audit, vehicular exhaust check, and industrial stack monitoring', 'airquality@cleanair.demo'),
        ('Water & Drainage Authority', 'WDA', 'Urban storm drain unblocking, untreated sewage prevention, and canal hygiene', 'drainage@cleanair.demo'),
        ('Public Health & Sanitation Wing', 'PHS', 'Bio-hazard remediation, public disinfection, and sanitary inspection', 'health.sanitation@cleanair.demo');
      `);
    }

    // 5. Seed Response Teams if none exist
    const teamsCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM teams;");
    if (parseInt(teamsCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO teams (name, department_id, zone, lead_name) VALUES
        ('Zone 1 Rapid Waste Taskforce', 1, 'Ward 1 - Central', 'Lead Officer Anand Verma'),
        ('Zone 4 Industrial Emissions Squad', 2, 'Ward 4 - East Industrial', 'Insp. Sarah Khan'),
        ('Central Drainage Response Crew', 3, 'Ward 2 & Ward 3', 'Eng. Vikram Sethi'),
        ('Mobile Sanitation Flying Squad', 4, 'City-wide', 'Dr. Meenakshi Sundaram');
      `);
    }

    // 6. Seed/Ensure standard Demo Users (Citizen, Moderator, Authority, Admin)
    const hash = bcrypt.hashSync("demo123", 10);
    const demoAccounts = [
      { name: "Admin User", email: "admin@cleanair.demo", role: "admin" },
      { name: "Moderator Maya", email: "moderator@cleanair.demo", role: "moderator" },
      { name: "Authority Officer Anand", email: "authority@cleanair.demo", role: "authority" },
      { name: "Worker Raj", email: "worker@cleanair.demo", role: "authority" },
      { name: "Citizen Priya", email: "citizen@cleanair.demo", role: "citizen" },
      { name: "Citizen Aarav", email: "aarav@cleanair.demo", role: "citizen" },
    ];

    for (const acc of demoAccounts) {
      const userExists = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE email = '${acc.email}' LIMIT 1;`
      );
      if (userExists.rows.length === 0) {
        await client.exec(`
          INSERT INTO users (name, email, password_hash, role, preferred_language)
          VALUES ('${acc.name}', '${acc.email}', '${hash}', '${acc.role}', 'en');
        `);
      }
    }

    // 7. Seed Official Verified Emergency & Civic Contacts
    const contactsCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM official_contacts;");
    if (parseInt(contactsCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO official_contacts (
          organization_name, department, phone_number, website, email, region, contact_type, description, verified_source, last_verified_date, is_active
        ) VALUES
        (
          'Central Pollution Control Board (CPCB)',
          'Central Environmental Control & Air Quality',
          '011-43102030',
          'https://cpcb.nic.in',
          'cpcb@nic.in',
          'National / NCR',
          'Pollution Control Board',
          'Statutory organization responsible for promoting clean streams, monitoring national ambient air quality, and industrial compliance standards under the Water and Air Acts.',
          'Ministry of Environment, Forest and Climate Change (MoEFCC) Official Directory',
          NOW(),
          true
        ),
        (
          'Delhi Pollution Control Committee (DPCC)',
          'Air & Noise Pollution Monitoring Cell',
          '011-23860389',
          'https://dpcc.delhigovt.nic.in',
          'msdpcc@nic.in',
          'Delhi / NCR',
          'Pollution Control Board',
          'State agency executing air pollution control, diesel generator emission inspections, and construction dust mitigation mandates in the capital territory.',
          'Govt. of NCT of Delhi Official Portal',
          NOW(),
          true
        ),
        (
          'National Emergency Response Support System',
          'Unified Police, Fire & Medical Dispatch',
          '112',
          'https://112.gov.in',
          'contactus-erss@gov.in',
          'All India',
          'Emergency',
          'Pan-India single emergency number for immediate life-safety hazards, chemical transport incidents, structural collapse, and hazardous leaks.',
          'Ministry of Home Affairs (MHA) Directorate',
          NOW(),
          true
        ),
        (
          'Municipal Corporation Solid Waste Control Room',
          'Sanitation & Illegal Dumping Action Cell',
          '155304',
          'https://mcdonline.nic.in',
          'sanitation.control@mcd.gov.in',
          'Municipal Region',
          'Waste Management',
          'Direct municipal 24x7 control room for garbage pile removal, overflowing commercial containers, and municipal landfill complaints.',
          'Municipal Corporation Citizen Services Charter',
          NOW(),
          true
        ),
        (
          'Water Supply & Sewage Emergency Helpline',
          'Jal Board Waste-Water Network',
          '1916',
          'https://delhijalboard.nic.in',
          'djb.grievance@nic.in',
          'Urban Water Network',
          'Water/Sewage',
          'Emergency response for sewage line ruptures, contamination of public tap lines, and toxic industrial effluent in open drains.',
          'Urban Water Services Board Official Directory',
          NOW(),
          true
        ),
        (
          'National Green Tribunal (NGT) Registry',
          'Judicial Environmental Redressal Office',
          '011-23043500',
          'https://greentribunal.gov.in',
          'rg.ngt@nic.in',
          'National',
          'Environmental Department',
          'Specialized judicial body equipped to handle multi-disciplinary environmental disputes concerning environmental protection and conservation of forests.',
          'Supreme Court of India / NGT Gazette',
          NOW(),
          true
        );
      `);
    }

    // 8. Seed/Normalize initial Reports
    const reportsCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM reports;");
    if (parseInt(reportsCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO reports (
          category, severity, priority, lat, lng, address, description, status, is_recurring_hotspot,
          assigned_department_id, assigned_team_id, resolution_notes, resolution_department, created_at, resolved_at
        ) VALUES
        ('garbage', 'high', 'high', 28.6315, 77.2167, 'Connaught Outer Circle, Near Block M', 'Large unsegregated municipal garbage pile blocking footpath at busy transit intersection', 'submitted', false, 1, 1, NULL, NULL, NOW() - INTERVAL '3 days', NULL),
        ('garbage', 'critical', 'urgent', 28.6320, 77.2180, 'Janpath Commercial Lane 3', 'Severe overflow from public municipal waste bin spilling into pedestrian zone', 'in_progress', true, 1, 1, NULL, NULL, NOW() - INTERVAL '2 days', NULL),
        ('industrial', 'critical', 'urgent', 28.6500, 77.2300, 'Mayapuri Industrial Phase II, Plot 14', 'Heavy dark particulate emission from industrial metal smelting stack during evening hours', 'under_review', true, 2, 2, NULL, NULL, NOW() - INTERVAL '1 day', NULL),
        ('burning', 'medium', 'medium', 28.6100, 77.2000, 'Lodhi Colony Sector 3 Park Boundary', 'Open burning of dry leaves and plastic wrappers producing dense local smoke', 'verified', false, 2, 2, NULL, NULL, NOW() - INTERVAL '4 days', NULL),
        ('drainage', 'high', 'high', 28.6600, 77.2400, 'Shahdara Metro Station Underpass', 'Untreated black sewage overflowing across carriage way posing immediate biological hazard', 'assigned', false, 3, 3, NULL, NULL, NOW() - INTERVAL '30 hours', NULL),
        ('dust', 'low', 'low', 28.6200, 77.2100, 'Barakhamba Road Construction Corridor', 'Uncovered sand piles causing particulate drift across traffic lanes', 'submitted', false, 2, 2, NULL, NULL, NOW() - INTERVAL '5 hours', NULL),
        ('smoke', 'high', 'high', 28.6510, 77.2310, 'Ring Road Bypass Junction', 'Grossly polluting heavy diesel truck exhaust recurring during morning rush', 'in_progress', false, 2, 2, NULL, NULL, NOW() - INTERVAL '18 hours', NULL),
        ('garbage', 'high', 'high', 19.0760, 72.8777, 'Marine Promenade North Breakwater', 'Accumulation of single-use plastic bottles and marine debris along rocks', 'resolved', true, 1, 1, 'Dedicated sanitation squad mobilized. 450kg plastic debris cleared and transferred to recycling facility.', 'Municipal Solid Waste Dept', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day');
      `);
    } else {
      // Normalize any legacy status strings in existing database
      await client.exec(`
        UPDATE reports SET status = 'submitted' WHERE status = 'reported';
        UPDATE reports SET status = 'in_progress' WHERE status = 'inProgress';
        UPDATE reports SET priority = 'medium' WHERE priority IS NULL;
      `);
    }

    // 9. Seed Community Confirmations if none exist
    const confirmCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM report_confirmations;");
    if (parseInt(confirmCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO report_confirmations (report_id, user_id, notes, created_at)
        SELECT r.id, u.id, 'Confirmed in locality', NOW() - INTERVAL '1 day'
        FROM reports r, users u
        WHERE r.id IN (1, 2, 5) AND u.email = 'citizen@cleanair.demo'
        ON CONFLICT DO NOTHING;
      `);
    }

    // 10. Seed Status History if none exist
    const historyCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM report_status_history;");
    if (parseInt(historyCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO report_status_history (report_id, old_status, new_status, notes, created_at)
        SELECT id, 'submitted', status, 'Initial case triage and verification recorded', created_at
        FROM reports;
      `);
    }

    // 11. Seed Achievements for demo citizen
    const achCheck = await client.query<{ count: string }>("SELECT COUNT(*) as count FROM achievements;");
    if (parseInt(achCheck.rows[0]?.count || "0") === 0) {
      await client.exec(`
        INSERT INTO achievements (user_id, badge_key, title, description, earned_at)
        SELECT id, 'first_report', 'First Report', 'Submitted first environmental report for municipal remediation', NOW() - INTERVAL '2 days'
        FROM users WHERE email = 'citizen@cleanair.demo'
        UNION ALL
        SELECT id, 'community_watcher', 'Community Watcher', 'Active monitoring of local environmental indicators and hotspots', NOW() - INTERVAL '1 day'
        FROM users WHERE email = 'citizen@cleanair.demo';
      `);
    }

    // Save snapshot
    const { snapshotPath } = getStoragePaths();
    const blob = await client.dumpDataDir();
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(snapshotPath, buffer);
    console.log("Database initialized and persisted successfully.");
  } catch (err) {
    console.error("Database initialization check error:", err);
  }
}

if (!globalForDb.__civicPulseInitPromise) {
  globalForDb.__civicPulseInitPromise = initializeSchemaAndSeed();
}
