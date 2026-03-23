export interface InventoryItem {
  id: string;
  name: string;
  category: "consumable" | "non-consumable";
  unit: string;
  stockTotal: number;
  stockAvailable: number;
  condition: "Good" | "Defective" | "Mixed";
  location: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  type: "borrow" | "return" | "reserve";
  status: "pending" | "approved" | "returned" | "overdue" | "rejected";
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ci" | "sa";
  ciId?: string;
}

export const mockItems: InventoryItem[] = [
  { id: "1", name: "Stethoscope", category: "non-consumable", unit: "pc", stockTotal: 30, stockAvailable: 22, condition: "Good", location: "C1A" },
  { id: "2", name: "Blood Pressure Apparatus", category: "non-consumable", unit: "set", stockTotal: 15, stockAvailable: 8, condition: "Good", location: "C1A" },
  { id: "3", name: "Penlight", category: "non-consumable", unit: "pc", stockTotal: 50, stockAvailable: 41, condition: "Mixed", location: "C1A" },
  { id: "4", name: "Thermometer (Digital)", category: "non-consumable", unit: "pc", stockTotal: 20, stockAvailable: 14, condition: "Good", location: "OR/DRN" },
  { id: "5", name: "Disposable Gloves (M)", category: "consumable", unit: "box", stockTotal: 100, stockAvailable: 67, condition: "Good", location: "C1L" },
  { id: "6", name: "Face Mask (Surgical)", category: "consumable", unit: "box", stockTotal: 80, stockAvailable: 52, condition: "Good", location: "C1L" },
  { id: "7", name: "Syringe 5ml", category: "consumable", unit: "pc", stockTotal: 500, stockAvailable: 340, condition: "Good", location: "C1L" },
  { id: "8", name: "IV Set (Macro)", category: "consumable", unit: "pc", stockTotal: 200, stockAvailable: 145, condition: "Good", location: "C1L" },
  { id: "9", name: "Wheelchair", category: "non-consumable", unit: "pc", stockTotal: 5, stockAvailable: 3, condition: "Good", location: "OR/DRN" },
  { id: "10", name: "Hospital Bed Model", category: "non-consumable", unit: "pc", stockTotal: 8, stockAvailable: 6, condition: "Mixed", location: "NCC1L" },
  { id: "11", name: "Suction Machine", category: "non-consumable", unit: "pc", stockTotal: 4, stockAvailable: 2, condition: "Good", location: "OR/DRN" },
  { id: "12", name: "Nebulizer", category: "non-consumable", unit: "pc", stockTotal: 10, stockAvailable: 7, condition: "Good", location: "C1A" },
  { id: "13", name: "Cotton Balls", category: "consumable", unit: "pack", stockTotal: 150, stockAvailable: 98, condition: "Good", location: "C1L" },
  { id: "14", name: "Alcohol (70%)", category: "consumable", unit: "bottle", stockTotal: 60, stockAvailable: 38, condition: "Good", location: "C1L" },
  { id: "15", name: "Anatomical Model (Skeleton)", category: "non-consumable", unit: "pc", stockTotal: 3, stockAvailable: 2, condition: "Good", location: "NCC1L" },
];

export const mockTransactions: Transaction[] = [
  { id: "T001", userId: "U1", userName: "Dr. Maria Santos", itemId: "1", itemName: "Stethoscope", type: "borrow", status: "approved", borrowDate: "2026-03-14", dueDate: "2026-03-21", quantity: 2 },
  { id: "T002", userId: "U2", userName: "Prof. Juan Reyes", itemId: "2", itemName: "Blood Pressure Apparatus", type: "borrow", status: "overdue", borrowDate: "2026-03-07", dueDate: "2026-03-14", quantity: 1 },
  { id: "T003", userId: "U3", userName: "Dr. Ana Cruz", itemId: "5", itemName: "Disposable Gloves (M)", type: "borrow", status: "pending", borrowDate: "2026-03-20", dueDate: "2026-03-27", quantity: 3 },
  { id: "T004", userId: "U1", userName: "Dr. Maria Santos", itemId: "9", itemName: "Wheelchair", type: "reserve", status: "approved", borrowDate: "2026-03-25", dueDate: "2026-04-01", quantity: 1 },
  { id: "T005", userId: "U4", userName: "Dr. Carlo Tan", itemId: "4", itemName: "Thermometer (Digital)", type: "borrow", status: "returned", borrowDate: "2026-03-10", dueDate: "2026-03-17", returnDate: "2026-03-15", quantity: 2 },
];

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  timeIn: string;
  timeOut?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  category: "inventory" | "transaction" | "user" | "system";
}

export const mockUsers: User[] = [
  { id: "SA1", name: "Alex Rivera", email: "alex.rivera@university.edu", role: "sa" },
  { id: "SA2", name: "Jamie Lee", email: "jamie.lee@university.edu", role: "sa" },
  { id: "CI001", name: "Dr. Maria Santos", email: "maria.santos@university.edu", role: "ci", ciId: "CI001" },
  { id: "CI002", name: "Prof. Juan Reyes", email: "juan.reyes@university.edu", role: "ci", ciId: "CI002" },
  { id: "CI003", name: "Dr. Ana Cruz", email: "ana.cruz@university.edu", role: "ci", ciId: "CI003" },
  { id: "CI004", name: "Dr. Carlo Tan", email: "carlo.tan@university.edu", role: "ci", ciId: "CI004" },
  { id: "CI005", name: "Prof. Lisa Garcia", email: "lisa.garcia@university.edu", role: "ci", ciId: "CI005" },
  { id: "CI006", name: "Dr. Mark Lopez", email: "mark.lopez@university.edu", role: "ci", ciId: "CI006" },
];

export const mockAttendance: AttendanceRecord[] = [
  { id: "A001", userId: "SA1", userName: "Alex Rivera", date: "2026-03-22", timeIn: "08:00 AM", timeOut: "05:00 PM" },
  { id: "A002", userId: "SA2", userName: "Jamie Lee", date: "2026-03-22", timeIn: "08:15 AM", timeOut: "05:15 PM" },
  { id: "A003", userId: "SA1", userName: "Alex Rivera", date: "2026-03-21", timeIn: "08:05 AM", timeOut: "05:10 PM" },
  { id: "A004", userId: "SA2", userName: "Jamie Lee", date: "2026-03-21", timeIn: "08:00 AM", timeOut: "05:00 PM" },
  { id: "A005", userId: "SA1", userName: "Alex Rivera", date: "2026-03-20", timeIn: "08:10 AM", timeOut: "05:05 PM" },
  { id: "A006", userId: "SA2", userName: "Jamie Lee", date: "2026-03-20", timeIn: "08:20 AM", timeOut: "05:20 PM" },
];

export const mockAuditLogs: AuditLog[] = [
  { id: "AL001", timestamp: "2026-03-22 09:15:23", userId: "SA1", userName: "Alex Rivera", action: "Approved Borrow Request", details: "T003 - Disposable Gloves (M) by Dr. Ana Cruz", category: "transaction" },
  { id: "AL002", timestamp: "2026-03-22 08:45:12", userId: "CI001", userName: "Dr. Maria Santos", action: "Submitted Borrow Request", details: "Stethoscope (Qty: 2)", category: "transaction" },
  { id: "AL003", timestamp: "2026-03-21 16:30:45", userId: "SA1", userName: "Alex Rivera", action: "Updated Inventory", details: "Adjusted stock for Syringe 5ml - Added 100 units", category: "inventory" },
  { id: "AL004", timestamp: "2026-03-21 14:20:33", userId: "SA2", userName: "Jamie Lee", action: "Created User Account", details: "New CI registered: Dr. Mark Lopez (CI006)", category: "user" },
  { id: "AL005", timestamp: "2026-03-21 11:10:22", userId: "CI002", userName: "Prof. Juan Reyes", action: "Overdue Item", details: "Blood Pressure Apparatus - Due: 2026-03-14", category: "transaction" },
  { id: "AL006", timestamp: "2026-03-20 15:45:18", userId: "SA1", userName: "Alex Rivera", action: "Rejected Reserve Request", details: "Wheelchair by Dr. Lisa Garcia - Item unavailable", category: "transaction" },
  { id: "AL007", timestamp: "2026-03-20 10:30:55", userId: "CI004", userName: "Dr. Carlo Tan", action: "Returned Item", details: "Thermometer (Digital) - On time", category: "transaction" },
  { id: "AL008", timestamp: "2026-03-20 09:15:40", userId: "SA1", userName: "Alex Rivera", action: "Added Inventory Item", details: "New item: Pulse Oximeter (Qty: 15)", category: "inventory" },
];

export const currentUser: User = {
  id: "SA1",
  name: "Alex Rivera",
  email: "alex.rivera@university.edu",
  role: "sa",
};
