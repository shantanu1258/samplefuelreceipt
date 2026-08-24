"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type FuelType = "Petrol" | "Diesel" | "CNG" | "EV Charge";
type TemplateId = "template1" | "template2" | "template3" | "template4" | "template5";

type BillForm = {
  stationName: string;
  dealerName: string;
  stationAddress: string;
  stationPhone: string;
  logoUrl: string;
  invoiceNumber: string;
  billDate: string;
  billTime: string;
  customerName: string;
  showCustomerName: boolean;
  showFccCode: boolean;
  showFccDate: boolean;
  showFccTime: boolean;
  welcomeText: string;
  footerText: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: FuelType;
  rate: string;
  total: string;
  atot: string;
  vtot: string;
  paymentMethod: string;
  taxMode: "None" | "CST TIN" | "GST TIN" | "TXN NO";
  taxValue: string;
  fccId: string;
  fipNo: string;
  nozzleNo: string;
  density: string;
  tollFree: string;
};

type SavedLogoAsset = {
  src: string;
  label: string;
};

type SavedBill = {
  id: string;
  savedAt: string;
  template: TemplateId;
  form: BillForm;
  logoId?: string;
};

type ReceiptDatabase = {
  version: 1;
  bills: SavedBill[];
  logos: Record<string, SavedLogoAsset>;
};

const fuelOptions: Array<{
  value: FuelType;
  abbreviation: string;
  unit: string;
  descriptor: string;
}> = [
  { value: "Petrol", abbreviation: "P", unit: "L", descriptor: "Motor spirit" },
  { value: "Diesel", abbreviation: "D", unit: "L", descriptor: "High-speed diesel" },
  { value: "CNG", abbreviation: "C", unit: "kg", descriptor: "Compressed natural gas" },
  { value: "EV Charge", abbreviation: "E", unit: "kWh", descriptor: "Electric charging" },
];

const receiptTemplates: Array<{
  id: TemplateId;
  name: string;
  description: string;
}> = [
  { id: "template1", name: "Template 1", description: "Formal invoice" },
  { id: "template2", name: "Template 2", description: "Pump slip" },
  { id: "template3", name: "Template 3", description: "Thermal" },
  { id: "template4", name: "Template 4", description: "Detailed" },
  { id: "template5", name: "Template 5", description: "Printer copy" },
];

const taxOptions: BillForm["taxMode"][] = ["None", "CST TIN", "GST TIN", "TXN NO"];
const receiptDatabaseKey = "fuel-receipt-studio:history:v1";
const receiptDatabaseVersion = 1 as const;
const receiptHistoryLimit = 50;
const sourceRepositoryUrl = "https://github.com/shantanu1258/fuel-receipt-studio";

const initialForm: BillForm = {
  stationName: "GREENWAY FUEL STATION",
  dealerName: "GREENWAY AUTO SERVICES",
  stationAddress: "MAIN ROAD, BENGALURU 560001",
  stationPhone: "",
  logoUrl: "",
  invoiceNumber: "FG-0001",
  billDate: "2026-08-24",
  billTime: "10:30",
  customerName: "WALK-IN CUSTOMER",
  showCustomerName: true,
  showFccCode: true,
  showFccDate: true,
  showFccTime: true,
  welcomeText: "Welcomes You",
  footerText: "Thank You! Please Visit Again.",
  vehicleNumber: "KA00XX0000",
  vehicleType: "Four Wheeler",
  fuelType: "Petrol",
  rate: "100.00",
  total: "2500.00",
  atot: "2500.00",
  vtot: "25.00",
  paymentMethod: "Cash",
  taxMode: "CST TIN",
  taxValue: "DEMO-TAX-NUMBER",
  fccId: "000000000",
  fipNo: "01",
  nozzleNo: "01",
  density: "750.0",
  tollFree: "",
};

const blankForm: BillForm = {
  ...initialForm,
  stationName: "",
  dealerName: "",
  stationAddress: "",
  stationPhone: "",
  logoUrl: "",
  invoiceNumber: "",
  customerName: "",
  showCustomerName: true,
  showFccCode: true,
  showFccDate: true,
  showFccTime: true,
  vehicleNumber: "",
  vehicleType: "",
  rate: "",
  total: "",
  atot: "",
  vtot: "",
  paymentMethod: "Cash",
  taxMode: "None",
  taxValue: "",
  fccId: "",
  fipNo: "",
  nozzleNo: "",
  density: "",
  tollFree: "",
};

function emptyReceiptDatabase(): ReceiptDatabase {
  return {
    version: receiptDatabaseVersion,
    bills: [],
    logos: {},
  };
}

function normalizeStoredForm(value: unknown): BillForm | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...initialForm };

  for (const [key, fallback] of Object.entries(initialForm)) {
    if (typeof source[key] === typeof fallback) normalized[key] = source[key];
  }

  const form = normalized as unknown as BillForm;
  if (!fuelOptions.some((option) => option.value === form.fuelType)) {
    form.fuelType = initialForm.fuelType;
  }
  if (!taxOptions.includes(form.taxMode)) form.taxMode = initialForm.taxMode;
  return form;
}

function compactReceiptDatabase(database: ReceiptDatabase): ReceiptDatabase {
  const bills = database.bills.slice(0, receiptHistoryLimit);
  const usedLogoIds = new Set(
    bills.map((bill) => bill.logoId).filter((logoId): logoId is string => Boolean(logoId)),
  );
  const logos = Object.fromEntries(
    Object.entries(database.logos).filter(([logoId]) => usedLogoIds.has(logoId)),
  );

  return {
    version: receiptDatabaseVersion,
    bills,
    logos,
  };
}

function readReceiptDatabase(): { database: ReceiptDatabase; error: boolean } {
  if (typeof window === "undefined") return { database: emptyReceiptDatabase(), error: false };

  try {
    const raw = window.localStorage.getItem(receiptDatabaseKey);
    if (!raw) return { database: emptyReceiptDatabase(), error: false };

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed.version !== receiptDatabaseVersion || !Array.isArray(parsed.bills)) {
      return { database: emptyReceiptDatabase(), error: true };
    }

    const logos: Record<string, SavedLogoAsset> = {};
    if (parsed.logos && typeof parsed.logos === "object" && !Array.isArray(parsed.logos)) {
      for (const [logoId, value] of Object.entries(parsed.logos as Record<string, unknown>)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const logo = value as Record<string, unknown>;
        if (
          typeof logo.src === "string" &&
          /^data:image\/(?:png|jpeg|webp);base64,/i.test(logo.src) &&
          typeof logo.label === "string"
        ) {
          logos[logoId] = { src: logo.src, label: logo.label };
        }
      }
    }

    const bills = parsed.bills
      .map((value): SavedBill | null => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        const bill = value as Record<string, unknown>;
        const storedForm = normalizeStoredForm(bill.form);
        if (
          !storedForm ||
          typeof bill.id !== "string" ||
          typeof bill.savedAt !== "string" ||
          !Number.isFinite(Date.parse(bill.savedAt)) ||
          !receiptTemplates.some((option) => option.id === bill.template)
        ) {
          return null;
        }

        const logoId = typeof bill.logoId === "string" && logos[bill.logoId]
          ? bill.logoId
          : undefined;
        return {
          id: bill.id,
          savedAt: bill.savedAt,
          template: bill.template as TemplateId,
          form: storedForm,
          ...(logoId ? { logoId } : {}),
        };
      })
      .filter((bill): bill is SavedBill => Boolean(bill))
      .sort((first, second) => Date.parse(second.savedAt) - Date.parse(first.savedAt));

    return {
      database: compactReceiptDatabase({
        version: receiptDatabaseVersion,
        bills,
        logos,
      }),
      error: false,
    };
  } catch {
    return { database: emptyReceiptDatabase(), error: true };
  }
}

function writeReceiptDatabase(database: ReceiptDatabase): ReceiptDatabase | null {
  if (typeof window === "undefined") return null;
  const compactDatabase = compactReceiptDatabase(database);

  try {
    window.localStorage.setItem(receiptDatabaseKey, JSON.stringify(compactDatabase));
    return compactDatabase;
  } catch {
    return null;
  }
}

function createHistoryId(prefix: "bill" | "logo") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatHistoryTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "Date not set";
  return `${day.padStart(2, "0")} ${monthNames[Number(month) - 1]} ${year}`;
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "Not Entered";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year.slice(-2)}`;
}

function formatPaddedReceiptNumber(value: string, integerDigits = 5) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "Not Entered";
  return parsed.toFixed(2).padStart(integerDigits + 3, "0");
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function cleanNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getSafeLogoUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

function taxLabel(mode: BillForm["taxMode"]) {
  if (mode === "CST TIN") return "CST No";
  if (mode === "GST TIN") return "GST No";
  if (mode === "TXN NO") return "TXN NO";
  return "";
}

function taxInputLabel(mode: BillForm["taxMode"]) {
  if (mode === "CST TIN") return "CST TIN Number";
  if (mode === "GST TIN") return "GST TIN Number";
  if (mode === "TXN NO") return "TXN Number";
  return "Tax Number";
}

export default function Home() {
  const [form, setForm] = useState<BillForm>(initialForm);
  const [template, setTemplate] = useState<TemplateId>("template4");
  const [receiptDatabase, setReceiptDatabase] = useState<ReceiptDatabase>(emptyReceiptDatabase);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyStorageError, setHistoryStorageError] = useState(false);
  const [message, setMessage] = useState("Ready to print");
  const [uploadedLogo, setUploadedLogo] = useState<{ src: string; label: string } | null>(null);
  const [logoError, setLogoError] = useState("");
  const [failedLogoSource, setFailedLogoSource] = useState("");
  const [logoStatus, setLogoStatus] = useState<"empty" | "loading" | "ready">("empty");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoReaderRef = useRef<FileReader | null>(null);

  const selectedFuel =
    fuelOptions.find((option) => option.value === form.fuelType) ?? fuelOptions[0];
  const rate = cleanNumber(form.rate);
  const total = cleanNumber(form.total);
  const quantity = rate > 0 && total > 0 ? total / rate : 0;
  const canExport = Boolean(form.stationName.trim() && form.invoiceNumber.trim() && rate && total);
  const remoteLogo = getSafeLogoUrl(form.logoUrl);
  const logoSource = uploadedLogo?.src || remoteLogo;
  const visibleLogoSource = logoSource && logoSource !== failedLogoSource ? logoSource : "";

  useEffect(() => {
    const syncHistory = () => {
      const storedHistory = readReceiptDatabase();
      setReceiptDatabase(storedHistory.database);
      setHistoryStorageError(storedHistory.error);
      setHistoryReady(true);
    };
    const initialHistoryTimer = window.setTimeout(syncHistory, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== receiptDatabaseKey) return;
      syncHistory();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(initialHistoryTimer);
      window.removeEventListener("storage", handleStorage);
      logoReaderRef.current?.abort();
    };
  }, []);

  function updateField<K extends keyof BillForm>(key: K, value: BillForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("Preview updated");
  }

  function updateLogoUrl(value: string) {
    setUploadedLogo(null);
    setFailedLogoSource("");
    setLogoError("");
    setLogoStatus(getSafeLogoUrl(value) ? "loading" : "empty");
    if (logoInputRef.current) logoInputRef.current.value = "";
    updateField("logoUrl", value);
  }

  function validateLogoUrl() {
    if (form.logoUrl.trim() && !remoteLogo) {
      setLogoError("Use a complete http:// or https:// image URL without sign-in details.");
    }
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Choose a PNG, JPEG or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Keep the logo under 2 MB.");
      event.target.value = "";
      return;
    }

    logoReaderRef.current?.abort();
    const reader = new FileReader();
    logoReaderRef.current = reader;
    setLogoError("");
    setMessage("Checking logo…");
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      const image = new Image();
      image.onload = () => {
        setUploadedLogo({ src: source, label: file.name });
        setForm((current) => ({ ...current, logoUrl: "" }));
        setFailedLogoSource("");
        setLogoStatus("loading");
        setMessage("Logo added from this device");
      };
      image.onerror = () => {
        setLogoError("That image could not be read. Try another file.");
        setMessage("Logo was not added");
        if (logoInputRef.current) logoInputRef.current.value = "";
      };
      image.src = source;
    };
    reader.onerror = () => {
      setLogoError("That image could not be read. Try another file.");
      setMessage("Logo was not added");
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    logoReaderRef.current?.abort();
    setUploadedLogo(null);
    setFailedLogoSource("");
    setLogoError("");
    setLogoStatus("empty");
    setForm((current) => ({ ...current, logoUrl: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
    setMessage("Logo removed");
  }

  function handleLogoDisplayError() {
    if (!logoSource) return;
    setFailedLogoSource(logoSource);
    setLogoStatus("empty");
    setLogoError("The selected logo could not be displayed.");
  }

  function saveCurrentReceipt(successMessage = "Receipt saved to history") {
    if (!canExport) {
      setMessage("Add the station, bill number, rate and amount before saving");
      return "failed" as const;
    }

    const storedHistory = readReceiptDatabase();
    if (storedHistory.error) {
      setHistoryStorageError(true);
      setHistoryReady(true);
      setMessage("Saved history could not be read, so this receipt was not added");
      return "failed" as const;
    }

    const sourceDatabase = storedHistory.database;
    const logos = { ...sourceDatabase.logos };
    let logoId: string | undefined;
    let addedLogoId: string | undefined;

    if (uploadedLogo) {
      const matchingLogo = Object.entries(logos).find(([, logo]) => logo.src === uploadedLogo.src);
      if (matchingLogo) {
        logoId = matchingLogo[0];
      } else {
        logoId = createHistoryId("logo");
        addedLogoId = logoId;
        logos[logoId] = uploadedLogo;
      }
    }

    const formSnapshot = { ...form };
    const fingerprint = JSON.stringify({ form: formSnapshot, template, logoId });
    const matchingBill = sourceDatabase.bills.find(
      (bill) => JSON.stringify({ form: bill.form, template: bill.template, logoId: bill.logoId }) === fingerprint,
    );
    const savedBill: SavedBill = {
      id: matchingBill?.id ?? createHistoryId("bill"),
      savedAt: new Date().toISOString(),
      template,
      form: formSnapshot,
      ...(logoId ? { logoId } : {}),
    };
    const bills = [savedBill, ...sourceDatabase.bills.filter((bill) => bill.id !== savedBill.id)];
    const savedDatabase = writeReceiptDatabase({
      version: receiptDatabaseVersion,
      bills,
      logos,
    });

    if (savedDatabase) {
      setReceiptDatabase(savedDatabase);
      setHistoryReady(true);
      setHistoryStorageError(false);
      setMessage(successMessage);
      return "saved" as const;
    }

    if (uploadedLogo) {
      const fallbackLogos = { ...sourceDatabase.logos };
      if (addedLogoId) delete fallbackLogos[addedLogoId];
      const fallbackFingerprint = JSON.stringify({
        form: formSnapshot,
        template,
        logoId: undefined,
      });
      const matchingFallbackBill = sourceDatabase.bills.find(
        (bill) =>
          JSON.stringify({ form: bill.form, template: bill.template, logoId: bill.logoId }) ===
          fallbackFingerprint,
      );
      const fallbackBill: SavedBill = {
        ...savedBill,
        id: matchingFallbackBill?.id ?? savedBill.id,
      };
      delete fallbackBill.logoId;
      const fallbackBills = [
        fallbackBill,
        ...sourceDatabase.bills.filter((bill) => bill.id !== fallbackBill.id),
      ];
      const fallbackDatabase = writeReceiptDatabase({
        version: receiptDatabaseVersion,
        bills: fallbackBills,
        logos: fallbackLogos,
      });

      if (fallbackDatabase) {
        setReceiptDatabase(fallbackDatabase);
        setHistoryReady(true);
        setHistoryStorageError(false);
        setMessage(`${successMessage} without the uploaded logo`);
        return "saved-without-logo" as const;
      }
    }

    setMessage("Browser storage is full or unavailable; receipt was not saved");
    return "failed" as const;
  }

  function canCreateReceiptFile() {
    if (!canExport) {
      setMessage("Add the station, bill number, rate and amount first");
      return false;
    }
    if (visibleLogoSource && logoStatus === "loading") {
      setMessage("Wait a moment for the logo to finish loading");
      return false;
    }
    return true;
  }

  function printReceipt() {
    if (!canCreateReceiptFile()) return;

    const historyResult = saveCurrentReceipt("Saved to history · opening print dialog…");
    if (historyResult === "failed") {
      setMessage("Opening print dialog; browser history could not be saved");
    } else if (historyResult === "saved-without-logo") {
      setMessage("Saved without the uploaded logo · opening print dialog…");
    }
    window.print();
  }

  async function downloadReceiptPdf(event?: FormEvent) {
    event?.preventDefault();
    if (!canCreateReceiptFile() || isDownloadingPdf) return;

    const receipt = document.getElementById("receipt");
    if (!receipt) {
      setMessage("Receipt preview is unavailable; refresh and try again");
      return;
    }

    setIsDownloadingPdf(true);
    setMessage("Creating a tightly cropped receipt PDF…");

    try {
      await document.fonts?.ready;
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const bounds = receipt.getBoundingClientRect();
      const receiptWidth = Math.ceil(Math.max(bounds.width, receipt.scrollWidth));
      const receiptHeight = Math.ceil(Math.max(bounds.height, receipt.scrollHeight));

      if (!receiptWidth || !receiptHeight) {
        throw new Error("Receipt has no visible dimensions");
      }

      const receiptPng = await toPng(receipt, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2,
        width: receiptWidth,
        height: receiptHeight,
        style: {
          margin: "0",
          transform: "none",
        },
      });
      const pixelsToPoints = 72 / 96;
      const pageWidth = receiptWidth * pixelsToPoints;
      const pageHeight = receiptHeight * pixelsToPoints;
      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? "landscape" : "portrait",
        unit: "pt",
        format: [pageWidth, pageHeight],
        compress: true,
      });
      pdf.setProperties({
        title: `Fuel receipt ${form.invoiceNumber}`,
        subject: `${form.stationName} fuel receipt`,
        creator: "Fuel Receipt Studio",
      });
      pdf.addImage(receiptPng, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

      const safeReceiptNumber = form.invoiceNumber
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "receipt";
      pdf.save(`fuel-receipt-${safeReceiptNumber}.pdf`);

      const historyResult = saveCurrentReceipt();
      if (historyResult === "failed") {
        setMessage("Receipt PDF downloaded; browser history could not be saved");
      } else if (historyResult === "saved-without-logo") {
        setMessage("Receipt PDF downloaded; history saved without the uploaded logo");
      } else {
        setMessage("Tightly cropped receipt PDF downloaded");
      }
    } catch {
      setMessage(
        remoteLogo && !uploadedLogo
          ? "PDF could not use that logo URL. Upload the logo file and try again."
          : "Receipt PDF could not be created. Please try again.",
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function copySummary() {
    if (!canExport) {
      setMessage("Complete the required bill details before copying");
      return;
    }

    const summaryLines = [
      "FUEL RECEIPT",
      form.stationName,
      form.stationAddress,
      `Receipt: ${form.invoiceNumber}`,
      `Date: ${formatDate(form.billDate)} ${form.billTime}`,
      ...(form.showCustomerName
        ? [`Customer: ${form.customerName || "Walk-in customer"}`]
        : []),
      `Vehicle: ${form.vehicleNumber || "Not provided"}`,
      `Product: ${form.fuelType}`,
      `Rate: ${formatMoney(rate)} / ${selectedFuel.unit}`,
      `Quantity: ${quantity.toFixed(2)} ${selectedFuel.unit}`,
      `Total: ${formatMoney(total)}`,
      `Payment: ${form.paymentMethod || "Not specified"}`,
    ];
    const summary = summaryLines.join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setMessage("Receipt summary copied");
    } catch {
      setMessage("Copy is unavailable in this browser");
    }
  }

  function clearForm() {
    logoReaderRef.current?.abort();
    setForm(blankForm);
    setUploadedLogo(null);
    setFailedLogoSource("");
    setLogoError("");
    setLogoStatus("empty");
    if (logoInputRef.current) logoInputRef.current.value = "";
    setMessage("Form cleared");
  }

  function cloneSavedBill(bill: SavedBill) {
    const savedLogo = bill.logoId ? receiptDatabase.logos[bill.logoId] ?? null : null;
    logoReaderRef.current?.abort();
    setForm({ ...initialForm, ...bill.form });
    setTemplate(bill.template);
    setUploadedLogo(savedLogo);
    setFailedLogoSource("");
    setLogoError("");
    setLogoStatus(savedLogo || getSafeLogoUrl(bill.form.logoUrl) ? "loading" : "empty");
    if (logoInputRef.current) logoInputRef.current.value = "";
    setMessage(`Receipt ${bill.form.invoiceNumber || bill.id} cloned — update it as needed`);
    document.getElementById("generator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteSavedBill(bill: SavedBill) {
    if (!window.confirm(`Delete saved receipt ${bill.form.invoiceNumber || "without a number"}?`)) {
      return;
    }

    const storedHistory = readReceiptDatabase();
    if (storedHistory.error) {
      setMessage("Saved history could not be updated");
      return;
    }
    const savedDatabase = writeReceiptDatabase({
      ...storedHistory.database,
      bills: storedHistory.database.bills.filter((savedBill) => savedBill.id !== bill.id),
    });
    if (!savedDatabase) {
      setMessage("Saved history could not be updated");
      return;
    }
    setReceiptDatabase(savedDatabase);
    setMessage("Saved receipt deleted");
  }

  function clearReceiptHistory() {
    if (
      !window.confirm(
        "Clear all saved receipts from this browser? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      window.localStorage.removeItem(receiptDatabaseKey);
      setReceiptDatabase(emptyReceiptDatabase());
      setHistoryStorageError(false);
      setHistoryReady(true);
      setMessage("Receipt history cleared");
    } catch {
      setMessage("Receipt history could not be cleared");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Fuel Receipt Studio home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>Fuel Receipt Studio</strong>
            <small>Private, local & instant</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="privacy-pill">
            <span className="privacy-dot" /> Your data stays here
          </span>
          <a href="#history">History</a>
          <a href="#generator">Create receipt</a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Fuel bills, minus the busywork</p>
            <h1 id="hero-title">
              Turn fill-ups into <em>tidy receipts.</em>
            </h1>
            <p className="hero-description">
              Enter the essentials and watch a polished, print-ready fuel receipt take shape in
              real time. No account, upload or external service required.
            </p>
            <div className="hero-points" aria-label="App highlights">
              <span><b>01</b> Live preview</span>
              <span><b>02</b> Five layouts</span>
              <span><b>03</b> Save as PDF</span>
            </div>
          </div>
          <div className="hero-ticket" aria-hidden="true">
            <div className="ticket-notch ticket-notch-left" />
            <div className="ticket-notch ticket-notch-right" />
            <p>THIS WEEK</p>
            <strong>
              {historyReady
                ? `${receiptDatabase.bills.length} ${receiptDatabase.bills.length === 1 ? "receipt" : "receipts"}`
                : "Local history"}
            </strong>
            <span><i /> saved on this device</span>
            <div className="ticket-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className="workspace" id="generator" aria-label="Fuel bill generator">
          <form className="editor-panel panel" onSubmit={downloadReceiptPdf}>
            <div className="panel-heading">
              <div>
                <p className="section-number">01 / DETAILS</p>
                <h2>Build your receipt</h2>
              </div>
              <span className="sample-label">Sample data</span>
            </div>

            <fieldset className="form-section">
              <legend>Fuel station</legend>
              <div className="field-grid full">
                <label className="field">
                  <span>Station name <b>*</b></span>
                  <input
                    required
                    value={form.stationName}
                    onChange={(event) => updateField("stationName", event.target.value)}
                    placeholder="e.g. Northstar Fuel Point"
                    autoComplete="organization"
                  />
                </label>
                <label className="field">
                  <span>Dealer name</span>
                  <input
                    value={form.dealerName}
                    onChange={(event) => updateField("dealerName", event.target.value)}
                    placeholder="e.g. Northstar Auto Services"
                  />
                </label>
                <label className="field">
                  <span>Address</span>
                  <textarea
                    value={form.stationAddress}
                    onChange={(event) => updateField("stationAddress", event.target.value)}
                    placeholder="Street, city, state and pincode"
                    rows={3}
                  />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={form.stationPhone}
                    onChange={(event) => updateField("stationPhone", event.target.value)}
                    placeholder="1800 000 0000"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>
                <label className="field">
                  <span>Bill / receipt no. <b>*</b></span>
                  <input
                    required
                    value={form.invoiceNumber}
                    onChange={(event) => updateField("invoiceNumber", event.target.value)}
                    placeholder="FG-0001"
                  />
                </label>
                <div className="field">
                  <div className="field-label-row">
                    <label htmlFor="fcc-code">FCC code / ID</label>
                    <label className="receipt-visibility-toggle">
                      <input
                        type="checkbox"
                        checked={form.showFccCode}
                        onChange={(event) => updateField("showFccCode", event.target.checked)}
                      />
                      <span>Show on receipt</span>
                    </label>
                  </div>
                  <input
                    id="fcc-code"
                    value={form.fccId}
                    onChange={(event) => updateField("fccId", event.target.value)}
                    placeholder="e.g. 000000000"
                    inputMode="numeric"
                  />
                </div>
                <div className="field fcc-visibility-field">
                  <span>FCC receipt lines</span>
                  <div className="visibility-options">
                    <label className="receipt-visibility-toggle">
                      <input
                        type="checkbox"
                        checked={form.showFccDate}
                        onChange={(event) => updateField("showFccDate", event.target.checked)}
                      />
                      <span>Show FCC date</span>
                    </label>
                    <label className="receipt-visibility-toggle">
                      <input
                        type="checkbox"
                        checked={form.showFccTime}
                        onChange={(event) => updateField("showFccTime", event.target.checked)}
                      />
                      <span>Show FCC time</span>
                    </label>
                  </div>
                </div>
                <div className="tax-settings field-span-two">
                  <span className="tax-title" id="tax-type-label">Tax Type</span>
                  <div className="tax-options" role="radiogroup" aria-labelledby="tax-type-label">
                    {taxOptions.map((option) => (
                      <label className="tax-option" key={option}>
                        <input
                          type="radio"
                          name="taxMode"
                          value={option}
                          checked={form.taxMode === option}
                          onChange={() => updateField("taxMode", option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {form.taxMode !== "None" && (
                    <label className="field tax-value-field">
                      <span>{taxInputLabel(form.taxMode)}</span>
                      <input
                        value={form.taxValue}
                        onChange={(event) =>
                          updateField("taxValue", event.target.value.toUpperCase())
                        }
                        placeholder={`Enter ${taxInputLabel(form.taxMode).toLowerCase()}`}
                        autoCapitalize="characters"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="logo-fieldset" aria-describedby="logo-help logo-error">
                <div className="logo-fieldset-heading">
                  <div>
                    <span>Station logo</span>
                    <small>Optional · appears on every receipt template</small>
                  </div>
                  {(uploadedLogo || form.logoUrl) && (
                    <button type="button" onClick={removeLogo}>Remove</button>
                  )}
                </div>
                <div className="logo-controls">
                  <label className="logo-upload" htmlFor="station-logo-file">
                    <input
                      ref={logoInputRef}
                      id="station-logo-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      onChange={handleLogoUpload}
                    />
                    <span aria-hidden="true">↑</span>
                    <b>{uploadedLogo ? "Replace image" : "Upload image"}</b>
                    <small>PNG, JPEG or WebP · max 2 MB</small>
                  </label>
                  <span className="logo-or">or</span>
                  <label className="field logo-url-field" htmlFor="station-logo-url">
                    <span>Paste an image URL</span>
                    <input
                      id="station-logo-url"
                      type="url"
                      value={form.logoUrl}
                      onChange={(event) => updateLogoUrl(event.target.value)}
                      onBlur={validateLogoUrl}
                      placeholder="https://example.com/logo.png"
                      aria-invalid={Boolean(logoError && form.logoUrl)}
                      aria-describedby="logo-help logo-error"
                    />
                  </label>
                </div>
                <p id="logo-help" className="logo-help">
                  A file chosen here stays in this browser tab. A pasted URL is loaded from that
                  website.
                  {uploadedLogo && <strong> Selected: {uploadedLogo.label}</strong>}
                </p>
                {logoError && <p id="logo-error" className="logo-error" role="alert">{logoError}</p>}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Transaction</legend>
              <div className="field-grid two">
                <label className="field">
                  <span>Bill date</span>
                  <input
                    type="date"
                    value={form.billDate}
                    onChange={(event) => updateField("billDate", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Bill time</span>
                  <input
                    type="time"
                    value={form.billTime}
                    onChange={(event) => updateField("billTime", event.target.value)}
                  />
                </label>
                <div className="field customer-name-field">
                  <div className="field-label-row">
                    <label htmlFor="customer-name">Customer name</label>
                    <label className="receipt-visibility-toggle">
                      <input
                        type="checkbox"
                        checked={form.showCustomerName}
                        onChange={(event) =>
                          updateField("showCustomerName", event.target.checked)
                        }
                      />
                      <span>Show on receipt</span>
                    </label>
                  </div>
                  <input
                    id="customer-name"
                    value={form.customerName}
                    onChange={(event) => updateField("customerName", event.target.value)}
                    placeholder="Walk-in customer"
                    autoComplete="name"
                  />
                </div>
                <label className="field">
                  <span>Vehicle number</span>
                  <input
                    className="uppercase-input"
                    value={form.vehicleNumber}
                    onChange={(event) => updateField("vehicleNumber", event.target.value.toUpperCase())}
                    placeholder="MH 01 AB 1234"
                  />
                </label>
                <label className="field">
                  <span>Vehicle type</span>
                  <select
                    value={form.vehicleType}
                    onChange={(event) => updateField("vehicleType", event.target.value)}
                  >
                    <option value="">Select vehicle</option>
                    <option>Two Wheeler</option>
                    <option>Three Wheeler</option>
                    <option>Four Wheeler</option>
                    <option>Commercial Vehicle</option>
                    <option>Heavy Vehicle</option>
                  </select>
                </label>
                <label className="field">
                  <span>Payment method</span>
                  <select
                    value={form.paymentMethod}
                    onChange={(event) => updateField("paymentMethod", event.target.value)}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Online</option>
                    <option>Debit Card</option>
                    <option>Credit Card</option>
                    <option>Wallet</option>
                  </select>
                </label>
              </div>
              <div className="field-grid two receipt-wording-fields">
                <label className="field">
                  <span>Top welcome text</span>
                  <input
                    value={form.welcomeText}
                    onChange={(event) => updateField("welcomeText", event.target.value)}
                    placeholder="Welcomes You"
                  />
                </label>
                <label className="field">
                  <span>Bottom footer text</span>
                  <input
                    value={form.footerText}
                    onChange={(event) => updateField("footerText", event.target.value)}
                    placeholder="Thank You! Please Visit Again."
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Fuel & amount</legend>
              <div className="fuel-picker" role="radiogroup" aria-label="Fuel type">
                {fuelOptions.map((fuel) => (
                  <label
                    className={`fuel-option ${form.fuelType === fuel.value ? "selected" : ""}`}
                    key={fuel.value}
                  >
                    <input
                      type="radio"
                      name="fuelType"
                      value={fuel.value}
                      checked={form.fuelType === fuel.value}
                      onChange={() => updateField("fuelType", fuel.value)}
                    />
                    <b>{fuel.abbreviation}</b>
                    <span>{fuel.value}</span>
                  </label>
                ))}
              </div>
              <div className="field-grid two amount-grid">
                <label className="field money-field">
                  <span>Rate / {selectedFuel.unit} <b>*</b></span>
                  <span className="input-prefix" aria-hidden="true">₹</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.rate}
                    onChange={(event) => updateField("rate", event.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </label>
                <label className="field money-field">
                  <span>Total amount <b>*</b></span>
                  <span className="input-prefix" aria-hidden="true">₹</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total}
                    onChange={(event) => updateField("total", event.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <div className="field-grid two totalizer-grid">
                <label className="field">
                  <span>ATOT</span>
                  <input
                    value={form.atot}
                    onChange={(event) => updateField("atot", event.target.value)}
                    placeholder="Enter ATOT value"
                    inputMode="decimal"
                  />
                </label>
                <label className="field">
                  <span>VTOT</span>
                  <input
                    value={form.vtot}
                    onChange={(event) => updateField("vtot", event.target.value)}
                    placeholder="Enter VTOT value"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <div className="calculation-strip">
                <span>Calculated quantity</span>
                <strong>{quantity.toFixed(2)} {selectedFuel.unit}</strong>
                <small>Total ÷ rate</small>
              </div>
            </fieldset>

            <details className="advanced-fields">
              <summary>
                <span>Pump IDs</span>
                <small>Optional</small>
              </summary>
              <div className="advanced-content">
                <div className="field-grid two">
                  <label className="field">
                    <span>FIP number</span>
                    <input
                      value={form.fipNo}
                      onChange={(event) => updateField("fipNo", event.target.value)}
                      placeholder="04"
                    />
                  </label>
                  <label className="field">
                    <span>Nozzle number</span>
                    <input
                      value={form.nozzleNo}
                      onChange={(event) => updateField("nozzleNo", event.target.value)}
                      placeholder="04"
                    />
                  </label>
                  <label className="field">
                    <span>Density (kg/m³)</span>
                    <input
                      value={form.density}
                      onChange={(event) => updateField("density", event.target.value)}
                      placeholder="750.0"
                      inputMode="decimal"
                    />
                  </label>
                  <label className="field field-span-two">
                    <span>Toll-free number</span>
                    <input
                      value={form.tollFree}
                      onChange={(event) => updateField("tollFree", event.target.value)}
                      placeholder="1800 123 0199"
                      inputMode="tel"
                    />
                  </label>
                </div>
              </div>
            </details>

            <div className="form-actions">
              <button className="button button-ghost" type="button" onClick={clearForm}>
                Clear form
              </button>
              <button className="button button-dark" type="button" onClick={copySummary}>
                Copy summary
              </button>
              <button className="button button-dark" type="button" onClick={() => saveCurrentReceipt()}>
                Save bill
              </button>
              <button className="button button-dark" type="button" onClick={printReceipt}>
                Print receipt
              </button>
              <button className="button button-accent" type="submit" disabled={isDownloadingPdf}>
                {isDownloadingPdf ? "Creating PDF…" : "Download receipt PDF"}
                {!isDownloadingPdf && <span aria-hidden="true">↓</span>}
              </button>
            </div>
            <p className={`form-status ${canExport ? "ready" : "needs-input"}`} role="status">
              <span /> {message}
            </p>
          </form>

          <aside className="preview-panel panel" aria-labelledby="preview-heading">
            <div className="panel-heading preview-heading-row">
              <div>
                <p className="section-number">02 / PREVIEW</p>
                <h2 id="preview-heading">Live Preview</h2>
              </div>
              <span className="preview-only-badge">Preview Only</span>
            </div>

            <div className="template-picker" aria-label="Receipt layout">
              {receiptTemplates.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={template === option.id ? "selected" : ""}
                  aria-pressed={template === option.id}
                  onClick={() => setTemplate(option.id)}
                >
                  <span className={`template-icon template-icon-${option.id}`} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>{option.name}</b>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>

            <div className="receipt-stage legacy-receipt-stage" data-template={template}>
              {template === "template1" && (
                <TemplateOneReceipt
                  form={form}
                  logoSource={visibleLogoSource}
                  rate={rate}
                  total={total}
                  quantity={quantity}
                  onLogoLoad={() => setLogoStatus("ready")}
                  onLogoError={handleLogoDisplayError}
                />
              )}
              {template === "template2" && (
                <TemplateTwoReceipt
                  form={form}
                  logoSource={visibleLogoSource}
                  rate={rate}
                  total={total}
                  quantity={quantity}
                  onLogoLoad={() => setLogoStatus("ready")}
                  onLogoError={handleLogoDisplayError}
                />
              )}
              {template === "template3" && (
                <TemplateThreeReceipt
                  form={form}
                  logoSource={visibleLogoSource}
                  rate={rate}
                  total={total}
                  quantity={quantity}
                  onLogoLoad={() => setLogoStatus("ready")}
                  onLogoError={handleLogoDisplayError}
                />
              )}
              {template === "template4" && (
                <TemplateFourReceipt
                  form={form}
                  logoSource={visibleLogoSource}
                  rate={rate}
                  total={total}
                  quantity={quantity}
                  onLogoLoad={() => setLogoStatus("ready")}
                  onLogoError={handleLogoDisplayError}
                />
              )}
              {template === "template5" && (
                <TemplateFiveReceipt
                  form={form}
                  logoSource={visibleLogoSource}
                  rate={rate}
                  total={total}
                  quantity={quantity}
                  onLogoLoad={() => setLogoStatus("ready")}
                  onLogoError={handleLogoDisplayError}
                />
              )}
            </div>
          </aside>
        </section>

        <section className="history-section panel" id="history" aria-labelledby="history-heading">
          <div className="history-heading">
            <div>
              <p className="section-number">03 / HISTORY</p>
              <h2 id="history-heading">Saved receipts</h2>
              <p>
                Printing, downloading or using Save bill adds a JSON snapshot to this browser.
                Clone one to reuse its details.
              </p>
            </div>
            <div className="history-heading-actions">
              <span className="history-count">
                {historyReady ? receiptDatabase.bills.length : "…"} / {receiptHistoryLimit}
              </span>
              {(receiptDatabase.bills.length > 0 || historyStorageError) && (
                <button type="button" onClick={clearReceiptHistory}>Clear history</button>
              )}
            </div>
          </div>

          {!historyReady ? (
            <div className="history-empty" role="status">Loading browser history…</div>
          ) : historyStorageError ? (
            <div className="history-empty" role="alert">
              <strong>Saved history could not be read.</strong>
              <span>You can clear it here and start a fresh local history.</span>
            </div>
          ) : receiptDatabase.bills.length === 0 ? (
            <div className="history-empty">
              <strong>No saved receipts yet.</strong>
              <span>Your first printed or manually saved bill will appear here.</span>
            </div>
          ) : (
            <ol className="history-list">
              {receiptDatabase.bills.map((bill) => {
                const templateName = receiptTemplates.find((option) => option.id === bill.template)?.name;
                return (
                  <li key={bill.id}>
                    <article className="history-card">
                      <div className="history-card-topline">
                        <span>{templateName || "Receipt"}</span>
                        <time dateTime={bill.savedAt}>{formatHistoryTimestamp(bill.savedAt)}</time>
                      </div>
                      <h3>Receipt #{bill.form.invoiceNumber || "Not numbered"}</h3>
                      <p className="history-station">{bill.form.stationName || "Fuel station"}</p>
                      <dl className="history-details">
                        <div><dt>Bill date</dt><dd>{formatDate(bill.form.billDate)}</dd></div>
                        <div><dt>Vehicle</dt><dd>{bill.form.vehicleNumber || "Not provided"}</dd></div>
                        <div><dt>Amount</dt><dd>{formatMoney(cleanNumber(bill.form.total))}</dd></div>
                      </dl>
                      <div className="history-card-actions">
                        <button type="button" onClick={() => cloneSavedBill(bill)}>
                          Clone to editor
                        </button>
                        <button
                          className="history-delete"
                          type="button"
                          onClick={() => deleteSavedBill(bill)}
                          aria-label={`Delete receipt ${bill.form.invoiceNumber || "without a number"}`}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="developer-strip" aria-labelledby="developer-heading">
          <div>
            <p className="section-number">PUBLIC REACT PROJECT</p>
            <h2 id="developer-heading">See how the receipt builder works.</h2>
          </div>
          <div>
            <p>
              Explore a practical React and TypeScript implementation of browser-local JSON
              storage, image uploads, live receipt rendering and print-to-PDF layouts.
            </p>
            <a href={sourceRepositoryUrl} target="_blank" rel="noreferrer">
              Browse the JavaScript source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="trust-strip" aria-label="Privacy information">
          <div>
            <span className="trust-number">100%</span>
            <p><b>Local by design.</b> Details and history stay in this browser and are never uploaded.</p>
          </div>
          <div>
            <span className="trust-mark" aria-hidden="true"><i /></span>
            <p><b>Built for real work.</b> Responsive layouts and receipt-sized PDF downloads included.</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Fuel Receipt Studio</span>
        <p>Public React project for quick, professional expense records.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}

type ReceiptProps = {
  form: BillForm;
  logoSource: string;
  rate: number;
  total: number;
  quantity: number;
  onLogoLoad: () => void;
  onLogoError: () => void;
};

function ReceiptLogo({
  source,
  className,
  onLoad,
  onError,
}: {
  source: string;
  className: string;
  onLoad: () => void;
  onError: () => void;
}) {
  if (!source) return null;

  return (
    // A user-selected data URL or arbitrary remote URL cannot use Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={source}
      alt="logo"
      referrerPolicy={source.startsWith("data:") ? undefined : "no-referrer"}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

function TemplateOneReceipt({
  form,
  logoSource,
  rate,
  total,
  quantity,
  onLogoLoad,
  onLogoError,
}: ReceiptProps) {
  const idLabel = taxLabel(form.taxMode);

  return (
    <article
      id="receipt"
      className="legacy-template legacy-template1 legacy-container"
      aria-label="Generated fuel receipt preview"
    >
      <div className="legacy-row legacy-row-border">
        <div className="legacy-col-12"><h3>Fuel Receipt</h3></div>
      </div>
      <div className="legacy-row">
        <div className="legacy-col-6 legacy-bold">
          <ReceiptLogo
            source={logoSource}
            className="legacy-logo"
            onLoad={onLogoLoad}
            onError={onLogoError}
          />
        </div>
        <div className="legacy-col-6 legacy-col-right">
          <h6>Receipt Details</h6>
          <p>Receipt Number: RP-{form.invoiceNumber || ""}</p>
          <p>Date: {formatDate(form.billDate)}</p>
          <p>Time: {form.billTime || ""}</p>
        </div>
      </div>
      <div className="legacy-row">
        <div className="legacy-col-6">
          <h6>Billed To</h6>
          {form.showCustomerName && <p>Customer Name: {form.customerName || ""}</p>}
          <p>Vehicle Number: {form.vehicleNumber || ""}</p>
          <p>Vehicle Type: {form.vehicleType || ""}</p>
        </div>
        <div className="legacy-col-6 legacy-col-right">
          <h6>Fuel Station Details</h6>
          <p>Fuel Station Name: {form.stationName || ""}</p>
          <p className="legacy-pre-line">Fuel Station Address: {form.stationAddress || ""}</p>
          {form.taxMode !== "None" && <p>{idLabel}: {form.taxValue || ""}</p>}
        </div>
      </div>
      <div className="legacy-row">
        <div className="legacy-col-12 legacy-col-right">
          <h6>Payment Method</h6>
          <p>{form.paymentMethod || ""}</p>
        </div>
      </div>
      <div className="legacy-row">
        <div className="legacy-col-12">
          <div className="legacy-panel-heading"><h6> Receipt Summary </h6></div>
        </div>
        <div className="legacy-col-12">
          <table className="legacy-summary-table">
            <thead>
              <tr><th>Fuel Rate</th><th>Quantity</th><th>Total Amount</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>₹ {rate ? form.rate : "0"}</td>
                <td>{quantity.toFixed(2)} lt.</td>
                <td>₹ {total ? form.total : "0"}</td>
              </tr>
              <tr><td /><td /><td><strong>Total: </strong>₹ {total ? form.total : "0"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="legacy-row">
        <div className="legacy-col-12 legacy-bottom">
          <p><strong>Thank you ! For Fuelling With Us !</strong></p>
          <p>For any queries and complaint visit our customer care</p>
          <p>Save fuel, secure the future!</p>
          <p>Time: {form.billTime || ""}</p>
        </div>
      </div>
    </article>
  );
}

function TemplateTwoReceipt({
  form,
  logoSource,
  rate,
  total,
  quantity,
  onLogoLoad,
  onLogoError,
}: ReceiptProps) {
  const idLabel = taxLabel(form.taxMode);

  return (
    <article
      id="receipt"
      className="legacy-template legacy-newbody legacy-template2"
      aria-label="Generated fuel receipt preview"
    >
      <div className="legacy-background">
        <ReceiptLogo
          source={logoSource}
          className="legacy-logo1"
          onLoad={onLogoLoad}
          onError={onLogoError}
        />
        <p className="legacy-top">{form.stationName || ""}</p>
        <p className="legacy-top">{form.dealerName || ""}</p>
        <p className="legacy-top legacy-pre-line">{form.stationAddress || ""}</p>
        <p className="legacy-original"> ORIGINAL</p>
        <div className="legacy-table-element">
          <p>{formatDate(form.billDate)}</p><p>{form.billTime || ""}</p>
        </div>
        {form.taxMode !== "None" && (
          <div className="legacy-slip-row legacy-cin">
            <span>{idLabel}:</span><span>{form.taxValue || ""}</span>
          </div>
        )}
        <div className="legacy-slip-row"><span>INVOICE NO:</span><span>{form.invoiceNumber || ""}</span></div>
        <div className="legacy-slip-row"><span>VEHICLE NO:</span><span>{form.vehicleNumber || ""}</span></div>
        <div className="legacy-slip-row"><span>NOZZLE NO:</span><span>{form.nozzleNo || ""}</span></div>
        <div className="legacy-slip-row"><span>PRODUCT:</span><span>{form.fuelType}</span></div>
        <div className="legacy-slip-row legacy-slip-row-three">
          <span>DENSITY:</span><span>{form.density || ""}</span><span>Kg/m3</span>
        </div>
        <div className="legacy-slip-row legacy-slip-row-three">
          <span>RATE:</span><span>{rate ? form.rate : "0"}</span><span>₹/Ltr</span>
        </div>
        <div className="legacy-slip-row legacy-slip-row-three">
          <span>VOLUME:</span><span>{quantity.toFixed(2)}</span><span>Ltr</span>
        </div>
        <div className="legacy-slip-row legacy-slip-row-three">
          <span>AMOUNT:</span><span>{total ? form.total : "0"}</span><span>₹</span>
        </div>
        <p className="legacy-bottom">Thank you Visit Again</p>
      </div>
    </article>
  );
}

function ThermalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="legacy-table-element">
      <p>{label}</p><p>{value}</p>
    </div>
  );
}

function ThermalFooter({ phone }: { phone: string }) {
  return (
    <p className="legacy-bottom">
      SAVE FUEL YAANI SAVE MONEY !! THANKS FOR FUELLING WITH US. YOU CAN NOW CALL US ON {phone}
      {" "}(TOLL-FREE) FOR QUERIES/COMPLAINTS.
    </p>
  );
}

function TemplateThreeReceipt({
  form,
  logoSource,
  rate,
  total,
  quantity,
  onLogoLoad,
  onLogoError,
}: ReceiptProps) {
  const idLabel = taxLabel(form.taxMode);

  return (
    <article
      id="receipt"
      className="legacy-template legacy-newbody legacy-thermal legacy-template3"
      aria-label="Generated fuel receipt preview"
    >
      <div className="legacy-background">
        <ReceiptLogo
          source={logoSource}
          className="legacy-logo1"
          onLoad={onLogoLoad}
          onError={onLogoError}
        />
        <p className="legacy-top">WELCOME!!!</p>
        {form.taxMode !== "None" && (
          <p className="legacy-top">{idLabel}: {form.taxValue || ""}</p>
        )}
        <p className="legacy-top legacy-station-line">
          {form.stationName || ""} {form.stationAddress || ""}
        </p>
        <div className="legacy-table1">
          <ThermalRow label="Receipt No.:" value={form.invoiceNumber || ""} />
        </div>
        <div className="legacy-table2">
          <ThermalRow label="PRODUCT:" value={form.fuelType} />
          <ThermalRow label="RATE/LTR:" value={`₹ ${rate ? form.rate : "0"}`} />
          <ThermalRow label="AMOUNT:" value={`₹ ${total ? form.total : "0"}`} />
          <ThermalRow label="VOLUME(LTR.):" value={`${quantity.toFixed(2)} lt`} />
        </div>
        <div className="legacy-table1">
          <ThermalRow label="VEH TYPE:" value={form.fuelType} />
          <ThermalRow label="VEH NO:" value={form.vehicleNumber || ""} />
          {form.showCustomerName && (
            <ThermalRow label="CUSTOMER NAME:" value={form.customerName || ""} />
          )}
        </div>
        <div className="legacy-table-element legacy-date-time">
          <p>Date: {formatDate(form.billDate)}</p><p>Time: {form.billTime || ""}</p>
        </div>
        <ThermalRow label="MODE:" value={form.paymentMethod || ""} />
        <ThermalFooter phone={form.tollFree || form.stationPhone || ""} />
      </div>
    </article>
  );
}

function TemplateFourDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div data-v-6c95757e="" className="table-element detail-row">
      <p data-v-6c95757e="" className="detail-label" style={{ margin: 4 }}>{label}</p>
      <span data-v-6c95757e="" className="detail-separator" aria-hidden="true">:</span>
      <p data-v-6c95757e="" className="detail-value" style={{ margin: 4 }}>{value}</p>
    </div>
  );
}

function TemplateFourReceipt({
  form,
  logoSource,
  rate,
  total,
  quantity,
  onLogoLoad,
  onLogoError,
}: ReceiptProps) {
  const idLabel = taxLabel(form.taxMode);

  return (
    <article
      id="receipt"
      className="legacy-template legacy-newbody legacy-thermal legacy-template4"
      aria-label="Generated fuel receipt preview"
    >
      <div data-v-6c95757e="" className="background">
        {logoSource && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-v-6c95757e=""
            src={logoSource}
            alt="logo"
            className="logo1"
            referrerPolicy={logoSource.startsWith("data:") ? undefined : "no-referrer"}
            onLoad={onLogoLoad}
            onError={onLogoError}
          />
        )}
        <p data-v-6c95757e="" className="top">
          {form.welcomeText || "Welcomes You"}
        </p>
        <p data-v-6c95757e="" style={{ margin: 4, textAlign: "center" }}>
          {form.stationName || ""} <span data-v-6c95757e="">{form.stationAddress || ""}</span>
        </p>
        <TemplateFourDetailRow label="Tel. No." value={form.stationPhone || ""} />
        <div data-v-6c95757e="" className="table1">
          <TemplateFourDetailRow label="Receipt No." value={form.invoiceNumber || ""} />
          {form.showFccCode && (
            <TemplateFourDetailRow label="FCC ID" value={form.fccId || ""} />
          )}
          <TemplateFourDetailRow label="FIP No." value={form.fipNo || ""} />
          <TemplateFourDetailRow label="Nozzle No." value={form.nozzleNo || ""} />
        </div>
        <div data-v-6c95757e="" className="table2">
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>PRODUCT: {form.fuelType}</p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>RATE/LTR: ₹ {rate ? form.rate : "0"}</p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>AMOUNT: ₹ {total ? form.total : "0"}</p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>
              VOLUME(LTR.): {quantity.toFixed(2)} lt
            </p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>ATOT: {form.atot || "Not Available"}</p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>VTOT: {form.vtot || "Not Available"}</p>
          </div>
        </div>
        <div data-v-6c95757e="" className="table1">
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>VEH TYPE: {form.fuelType} </p>
          </div>
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>VEH NO: {form.vehicleNumber || ""} </p>
          </div>
          {form.showCustomerName && (
            <div data-v-6c95757e="" className="table-element">
              <p data-v-6c95757e="" style={{ margin: 4 }}>
                CUSTOMER NAME: {form.customerName || ""}
              </p>
            </div>
          )}
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>Date: {formatDate(form.billDate)} </p>
          <p data-v-6c95757e=""> Time: {form.billTime || ""}</p>
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>MODE: {form.paymentMethod || ""}</p>
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>
            {form.taxMode !== "None" && (
              <span data-v-6c95757e=""> {idLabel}: {form.taxValue || ""} </span>
            )}
          </p>
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>LST No.: </p>
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>VAT No.: </p>
        </div>
        <div data-v-6c95757e="" className="table-element">
          <p data-v-6c95757e="" style={{ margin: 4 }}>ATTENDENT ID: Not Available</p>
        </div>
        {form.showFccDate && (
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>FCC DATE: Not Available</p>
          </div>
        )}
        {form.showFccTime && (
          <div data-v-6c95757e="" className="table-element">
            <p data-v-6c95757e="" style={{ margin: 4 }}>FCC TIME: Not Available</p>
          </div>
        )}
        <p data-v-6c95757e="" className="bottom">
          {form.footerText || "Thank You! Please Visit Again."}
        </p>
      </div>
    </article>
  );
}

function TemplateFiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="template5-row">
      <span className="template5-label">{label}</span>
      <span className="template5-colon" aria-hidden="true">:</span>
      <span className="template5-value">{value}</span>
    </div>
  );
}

function TemplateFiveReceipt({
  form,
  logoSource,
  quantity,
  onLogoLoad,
  onLogoError,
}: ReceiptProps) {
  const idLabel = taxLabel(form.taxMode);

  return (
    <article
      id="receipt"
      className="legacy-template legacy-newbody legacy-template5"
      aria-label="Generated fuel receipt preview"
    >
      <div className="template5-paper">
        <div className="template5-header">
          <ReceiptLogo
            source={logoSource}
            className="template5-logo"
            onLoad={onLogoLoad}
            onError={onLogoError}
          />
          <p className="template5-welcome">{form.welcomeText || "Welcomes You"}</p>
          <div className="template5-station">
            <p>{form.stationName || "YOUR FUEL STATION"}</p>
            <p>{form.stationAddress || "STATION ADDRESS"}</p>
          </div>
          <TemplateFiveRow label="Tel. No." value={form.stationPhone || ""} />
        </div>

        <div className="template5-group template5-pump-group">
          <TemplateFiveRow label="Receipt No." value={form.invoiceNumber || "Not Entered"} />
          {form.showFccCode && (
            <TemplateFiveRow label="FCC ID" value={form.fccId || "Not Entered"} />
          )}
          <TemplateFiveRow label="FIP No." value={form.fipNo || "Not Entered"} />
          <TemplateFiveRow label="Nozzle No." value={form.nozzleNo || "Not Entered"} />
          <TemplateFiveRow label="Product" value={form.fuelType} />
        </div>

        <div className="template5-group template5-sale-group">
          <TemplateFiveRow label="Preset Type" value="Amount" />
          <TemplateFiveRow label="Rate(Rs/L)" value={form.rate || "Not Entered"} />
          <TemplateFiveRow
            label="Volume(L)"
            value={formatPaddedReceiptNumber(String(quantity))}
          />
          <TemplateFiveRow
            label="Amount(Rs)"
            value={formatPaddedReceiptNumber(form.total)}
          />
          <TemplateFiveRow label="Atot" value={form.atot || "Not Entered"} />
          <TemplateFiveRow label="Vtot" value={form.vtot || "Not Entered"} />
        </div>

        <div className="template5-group template5-vehicle-group">
          <TemplateFiveRow label="Vehicle No" value={form.vehicleNumber || "Not Entered"} />
          {form.showCustomerName && (
            <TemplateFiveRow
              label="Customer Name"
              value={form.customerName || "Not Entered"}
            />
          )}
          <TemplateFiveRow label="Mobile No" value="Not Entered" />
        </div>

        <div className="template5-group template5-date-group">
          <TemplateFiveRow label="Date" value={formatShortDate(form.billDate)} />
          <TemplateFiveRow label="Time" value={form.billTime || "Not Entered"} />
        </div>

        <div className="template5-group template5-status-group">
          {form.taxMode !== "None" && (
            <TemplateFiveRow label={idLabel} value={form.taxValue || "Not Available"} />
          )}
          <TemplateFiveRow label="LST No" value="" />
          <TemplateFiveRow label="VAT No" value="" />
          <TemplateFiveRow label="ATTENDANT ID" value="Not Available" />
          {form.showFccDate && <TemplateFiveRow label="FCC DATE" value="Not Available" />}
          {form.showFccTime && <TemplateFiveRow label="FCC TIME" value="Not Available" />}
        </div>

        <p className="template5-footer">
          {form.footerText || "Thank You! Please Visit Again."}
        </p>
      </div>
    </article>
  );
}
