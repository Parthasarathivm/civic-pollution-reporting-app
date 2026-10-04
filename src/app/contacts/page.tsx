"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { isAdminRole } from "@/lib/auth";

interface OfficialContact {
  id: number;
  organizationName: string;
  department: string;
  phoneNumber: string;
  website: string | null;
  email: string | null;
  region: string;
  contactType: string;
  description: string | null;
  verifiedSource: string;
  lastVerifiedDate: string;
  isActive: boolean;
}

const CONTACT_TYPES = [
  "all",
  "Emergency",
  "Pollution Control Board",
  "Waste Management",
  "Water/Sewage",
  "Environmental Department",
  "Public Health",
];

const REGIONS = [
  "all",
  "National / NCR",
  "Delhi / NCR",
  "Municipal Region",
  "Urban Water Network",
  "All India",
];

export default function ContactsPage() {
  const { user, token } = useAppStore();
  const isAdmin = isAdminRole(user?.role);

  const [contacts, setContacts] = useState<OfficialContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // Admin Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<OfficialContact | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    organizationName: "",
    department: "",
    phoneNumber: "",
    website: "",
    email: "",
    region: "National / NCR",
    contactType: "Pollution Control Board",
    description: "",
    verifiedSource: "",
  });

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Could not load contacts");
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error(err);
      setError("Unable to retrieve official contacts directory. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/contacts")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load contacts");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setContacts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError("Unable to retrieve official contacts directory. Please retry.");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filteredContacts = contacts.filter((c) => {
    if (selectedType !== "all" && c.contactType !== selectedType) return false;
    if (selectedRegion !== "all" && c.region !== selectedRegion) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.organizationName.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    setSaving(true);
    try {
      if (editingContact) {
        // Edit contact
        const res = await fetch(`/api/contacts/${editingContact.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            markVerifiedNow: true,
          }),
        });
        if (!res.ok) throw new Error("Failed to update contact");
      } else {
        // Add new contact
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create contact");
      }

      setShowAddModal(false);
      setEditingContact(null);
      setFormData({
        organizationName: "",
        department: "",
        phoneNumber: "",
        website: "",
        email: "",
        region: "National / NCR",
        contactType: "Pollution Control Board",
        description: "",
        verifiedSource: "",
      });
      await loadContacts();
    } catch (err) {
      alert("Error saving contact. Please check authorization and required fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleReverifyNow = async (contactId: number) => {
    if (!token || !isAdmin) return;
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markVerifiedNow: true }),
      });
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (contactId: number) => {
    if (!token || !isAdmin) return;
    if (!confirm("Are you sure you want to deactivate this official contact?")) return;
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🏛️</span>
              <span
                className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
              >
                Official Civic Directory
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Emergency & Official Contacts
            </h1>
            <p className="text-sm theme-text-muted mt-1 max-w-2xl">
              Verified public directory of municipal authorities, statutory pollution control boards, and emergency response services. All telephone numbers and links are vetted against official government gazettes.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setEditingContact(null);
                setFormData({
                  organizationName: "",
                  department: "",
                  phoneNumber: "",
                  website: "",
                  email: "",
                  region: "National / NCR",
                  contactType: "Pollution Control Board",
                  description: "",
                  verifiedSource: "State / Central Gazette",
                });
                setShowAddModal(true);
              }}
              className="theme-btn flex items-center gap-2 self-start"
            >
              <span>➕ Add Official Contact</span>
            </button>
          )}
        </div>

        {/* Verification Transparency Notice */}
        <div
          className="p-4 rounded-xl mb-6 border flex items-start gap-3"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <span className="text-xl">🛡️</span>
          <div className="text-xs space-y-1">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Zero Synthetic Numbers Policy
            </p>
            <p className="theme-text-muted">
              CivicPulse enforces strict data integrity: no synthetic or placeholder phone numbers are generated. Each listed institution represents an active statutory public office with an explicitly documented source and verification timestamp.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="theme-card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">
                Search Contacts
              </label>
              <input
                type="text"
                placeholder="Search organization, department, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="theme-input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">
                Category / Agency Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="theme-input text-sm w-full"
              >
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "All Categories" : t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">
                Region / Jurisdiction
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="theme-input text-sm w-full"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? "All Jurisdictions" : r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-16 text-center">
            <span className="spinner mb-3 inline-block" />
            <p className="text-sm theme-text-muted">Loading verified directory...</p>
          </div>
        ) : error ? (
          <div className="theme-card text-center py-12">
            <p className="text-base text-red-500 font-medium">{error}</p>
            <button onClick={loadContacts} className="theme-btn mt-4 text-xs">
              Retry Connection
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="theme-card text-center py-14">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              No official contacts found
            </p>
            <p className="text-xs theme-text-muted mt-1">
              Try adjusting your category or jurisdiction filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="theme-card flex flex-col justify-between transition-all hover:shadow-md"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--accent-light)",
                        color: "var(--accent)",
                      }}
                    >
                      {contact.contactType}
                    </span>
                    <span className="text-xs theme-text-muted flex items-center gap-1">
                      <span>📍</span> {contact.region}
                    </span>
                  </div>

                  {/* Title & Dept */}
                  <h3 className="font-bold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>
                    {contact.organizationName}
                  </h3>
                  <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mt-0.5">
                    {contact.department}
                  </p>

                  {/* Description */}
                  {contact.description && (
                    <p className="text-xs theme-text-muted mt-2.5 leading-relaxed">
                      {contact.description}
                    </p>
                  )}

                  {/* Verified Source Box */}
                  <div
                    className="mt-3 p-2.5 rounded-lg border text-xs space-y-1"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.03)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        ✓ Verified Source
                      </span>
                      <span className="text-[11px] theme-text-muted">
                        Last verified:{" "}
                        {new Date(contact.lastVerifiedDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] theme-text-muted truncate">
                      Source: {contact.verifiedSource}
                    </p>
                  </div>
                </div>

                {/* Actions & Telephone */}
                <div className="mt-5 pt-3 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${contact.phoneNumber.replace(/[^0-9+]/g, "")}`}
                      className="theme-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <span>📞</span>
                      <span className="font-mono font-bold">{contact.phoneNumber}</span>
                    </a>

                    {contact.website && (
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="theme-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <span>🌐</span>
                        <span>Portal</span>
                      </a>
                    )}

                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="theme-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <span>✉️</span>
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReverifyNow(contact.id)}
                        title="Mark verified today"
                        className="p-1.5 rounded hover:bg-black/5 text-xs text-emerald-600 font-semibold"
                      >
                        Verify Now
                      </button>
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setFormData({
                            organizationName: contact.organizationName,
                            department: contact.department,
                            phoneNumber: contact.phoneNumber,
                            website: contact.website || "",
                            email: contact.email || "",
                            region: contact.region,
                            contactType: contact.contactType,
                            description: contact.description || "",
                            verifiedSource: contact.verifiedSource,
                          });
                          setShowAddModal(true);
                        }}
                        className="p-1.5 rounded hover:bg-black/5 text-xs theme-text-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(contact.id)}
                        className="p-1.5 rounded hover:bg-black/5 text-xs text-red-500"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admin Add/Edit Modal */}
        {showAddModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div
              className="theme-card max-w-lg w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                  {editingContact ? "Edit Official Contact" : "Add Verified Official Contact"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded hover:bg-black/5 text-sm theme-text-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="theme-input text-sm w-full"
                    placeholder="e.g. State Pollution Control Board"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Department / Wing *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="theme-input text-sm w-full"
                    placeholder="e.g. Hazardous Effluent & Air Cell"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="theme-input text-sm w-full"
                      placeholder="e.g. 011-23860389 or 112"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Contact Type *
                    </label>
                    <select
                      value={formData.contactType}
                      onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
                      className="theme-input text-sm w-full"
                    >
                      {CONTACT_TYPES.filter((t) => t !== "all").map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Official Portal Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="theme-input text-sm w-full"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="theme-input text-sm w-full"
                      placeholder="helpline@gov.in"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Region / Jurisdiction *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="theme-input text-sm w-full"
                    placeholder="e.g. Delhi / NCR or Municipal Region"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Verified Source Publication *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.verifiedSource}
                    onChange={(e) => setFormData({ ...formData, verifiedSource: e.target.value })}
                    className="theme-input text-sm w-full"
                    placeholder="e.g. State Gazette Directory Vol. 14 / MoEFCC"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Description & Mandate
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="theme-input text-sm w-full"
                    placeholder="Statutory scope and hours of operation"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="theme-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="theme-btn text-xs"
                  >
                    {saving ? "Saving..." : editingContact ? "Update Contact" : "Add Contact"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
