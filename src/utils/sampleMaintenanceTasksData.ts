
import * as XLSX from 'xlsx';

export interface MaintenanceTask {
  Asset: string;
  Component: string;
  'Failure Mode': string;
  'Task Description': string;
  Frequency: number;
  'Frequency Units': string;
  'Maintenance Type': string;
}

export const sampleMaintenanceTasksData: MaintenanceTask[] = [
  {
    Asset: "Conveyor",
    Component: "Idlers",
    "Failure Mode": "Bearing Failure",
    "Task Description": "Conveyor idlers - Routine Inspection",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Conveyor Belt",
    "Failure Mode": "Belt worn\nBelt ripped/torn",
    "Task Description": "Conveyor Belt - Conveyor belt condition inspection",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Belt tensioning",
    "Failure Mode": "Fails to apply correct tension",
    "Task Description": "Screw Take-Up - Routine conveyor belt inspection includes screw take up",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Skirting",
    "Failure Mode": "Skirting - Skirting ripped/torn/missing due to abrasion",
    "Task Description": "Skirting - Routine conveyor belt inspection includes skirting",
    Frequency: 1,
    "Frequency Units": "Days",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Pulleys",
    "Failure Mode": "1) Bearing failure\n2) Worn lagging\n3) Belt not tracking correctly",
    "Task Description": "Pulleys - Routine inspection includes thermographic imaging of pulley bearings, where fitted conduct vibration analysis",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Guarding",
    "Failure Mode": "Guards loose due to broken frame/ missing bolts",
    "Task Description": "Guarding - Routine condition inspection",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Belt Joiner",
    "Failure Mode": "Conveyor Belt - Belt tracking off due to conveyor joint misalignment",
    "Task Description": "Conveyor Belt - Routine conveyor belt condition inspection includes belt tracking",
    Frequency: 1,
    "Frequency Units": "Days",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Tracking Frames",
    "Failure Mode": "Fails to guide belt",
    "Task Description": "Belt Tracking Frame - Grease belt tracking frame",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Lubrication"
  },
  {
    Asset: "Conveyor",
    Component: "Belt cleaners",
    "Failure Mode": "Fails to Clean belt",
    "Task Description": "Belt cleaning scraper- Inspect wear segments. Adjust as necessary.",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Conveyor weather/dust covers",
    "Failure Mode": "Weather/dust covers missing",
    "Task Description": "Inspect weather covers for condition and security- Replace/refasten if necessary",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Drive Motor",
    "Failure Mode": "1) Conveyor Drive - Motor bearing collapsed due to contamination\n2) Conveyor Drive - Motor bearing collapsed due to loose hold down bolts\n3) Conveyor Drive - Motor bearing collapsed due to fatigue in normal operation\n4) Conveyor Drive - Motor bearing seized due to lubrication\n5) Conveyor Drive - Motor insulation burnt due to overheating\n6) Conveyor Drive - Motor open circuited due to vibration\n7) Conveyor Drive - Motor short circuited due to water ingress",
    "Task Description": "Conveyor Drive - Condition Monitoring -Bearing vibration",
    Frequency: 6,
    "Frequency Units": "Months",
    "Maintenance Type": "General"
  },
  {
    Asset: "Conveyor",
    Component: "Drive Gearbox",
    "Failure Mode": "1) Collapsed bearings\n2) Oil temperature high\n3) Gears damaged\n4) Oil exceeds ISO Cleanliness limit",
    "Task Description": "Gearbox - Routine machine inspection",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Drive Coupling",
    "Failure Mode": "1) Conveyor Drive - Coupling bolt flexible rubbers worn-out due to misalignment\n2) Conveyor Drive - Coupling excessive vibration due to worn coupling rubbers\n3) Conveyor Drive - Coupling overheats due to coupling misalignment.\n4) Conveyor Drive -Coupling halves- gap opens due to movement of one half on keyway.\n5) Conveyor Drive - Coupling bolt broken",
    "Task Description": "Conveyor Drive - Routine machine inspection - Inspect condition of drive coupling",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Cabinet",
    "Failure Mode": "Seal does not prevent moisture ingress",
    "Task Description": "Junction Box - Replace desiccant. Inspect door seal and fasteners.",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Conveyor",
    Component: "Pre-start warning systems",
    "Failure Mode": "Audible siren and integrated light do not function",
    "Task Description": "Pre-start Siren - Test pre-start siren and integrated light",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "General"
  },
  {
    Asset: "Feeder",
    Component: "Idlers",
    "Failure Mode": "Bearing Failure",
    "Task Description": "Conveyor idlers - Routine Inspection",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Feeder",
    Component: "Conveyor Belt",
    "Failure Mode": "Belt worn\nBelt ripped/torn",
    "Task Description": "Conveyor Belt - Conveyor belt condition inspection",
    Frequency: 2,
    "Frequency Units": "Weeks",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Feeder",
    Component: "Drive Motor",
    "Failure Mode": "1) Conveyor Drive - Motor bearing collapsed\n2) Conveyor Drive - Motor bearing seized\n3) Conveyor Drive - Motor insulation burnt due to overheating\n4) Conveyor Drive - Motor open circuited due to vibration\n5) Conveyor Drive - Motor short circuited due to water ingress",
    "Task Description": "Conveyor Drive - Condition Monitoring -Bearing vibration",
    Frequency: 6,
    "Frequency Units": "Months",
    "Maintenance Type": "General"
  },
  {
    Asset: "Feeder",
    Component: "Drive Gearbox",
    "Failure Mode": "1) Collapsed bearings\n2) Oil temperature high\n3) Gears damaged\n4) Oil exceeds ISO Cleanliness limit",
    "Task Description": "Gearbox - Routine machine inspection",
    Frequency: 6,
    "Frequency Units": "Months",
    "Maintenance Type": "Inspection"
  },
  {
    Asset: "Feeder",
    Component: "Emergency Stop",
    "Failure Mode": "Estop/ Lanyard Estop - Circuit fault.",
    "Task Description": "Function test E-Stop switch emergency stop",
    Frequency: 3,
    "Frequency Units": "Months",
    "Maintenance Type": "General"
  }
];

export function createSampleMaintenanceTasksFile(): File {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(sampleMaintenanceTasksData);
  
  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Maintenance Tasks");
  
  // Write to buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Create file
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return new File([blob], 'Generated_Maintenance_Tasks.xlsx', { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
