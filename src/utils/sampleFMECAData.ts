import * as XLSX from "xlsx";

export const sampleFMECAData = [
  // Conveyor - Row 1
  {
    "Asset Type": "Conveyor",
    Classification: "Belt Conveyor",
    FLOC: "FLOC S",
    Component: "Idlers",
    "Main Function": "Supports & Tracks and shapes conveyor belt with product",
    "Causes of Damage Mechanisms":
      "1) Insufficient Lubrication\n2) Exposure to environment / chemical attack\n3) Normal Use",
    "Damage Mechanisms": "1) Worn\n2) Seized",
    "Failure Modes": "Bearing Failure",
    "Final Failure Mode": "1) Thermal Stresss\n2) Belt Friction",
    "Effect of Final Failure": "Potential belt fire",
    "Downtime Hrs": "",
    "Downtime Reason": "Fire damage rectification",
    "Financial Impact": "",
    "Financial Severity Level": "4",
    "Overall Severity Level": "4",
    "Safety Severity Level": "1",
    "Safety Reason": "Low level impact resulting in first aid only",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "1",
    "Community Reason":
      "Minor, temporary community impact that recovers with little intervention",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Conveyor idlers - Routine Inspection",
    "Recommended Control Frequency Interval": "2",
    "Recommended Control Frequency Units": "Weeks",
  },
  // Conveyor - Row 2
  {
    "Asset Type": "Conveyor",
    Classification: "Belt Conveyor",
    FLOC: "FLOC S",
    Component: "Conveyor Belt",
    "Main Function": "Support the product being transferred",
    "Causes of Damage Mechanisms": "1) Abrasion\n2) Foreign Object",
    "Damage Mechanisms": "1) Worn\n2) Torn",
    "Failure Modes": "Belt worn\nBelt ripped/torn",
    "Final Failure Mode": "Belt failure",
    "Effect of Final Failure": "Production Loss",
    "Downtime Hrs": "",
    "Downtime Reason": "Belt replacement",
    "Financial Impact": "",
    "Financial Severity Level": "4",
    "Overall Severity Level": "4",
    "Safety Severity Level": "1",
    "Safety Reason": "Low level impact resulting in first aid only",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "1",
    "Community Reason":
      "Minor, temporary community impact that recovers with little intervention",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Conveyor Belt - Conveyor belt condition inspection",
    "Recommended Control Frequency Interval": "2",
    "Recommended Control Frequency Units": "Weeks",
  },
  // Elevator - Row 1
  {
    "Asset Type": "Elevator",
    Classification: "Bucket",
    FLOC: "FLOC S",
    Component: "Buckets",
    "Main Function": "Carries product vertically",
    "Causes of Damage Mechanisms": "1) Abrasion\n2) Impact\n3) Normal use",
    "Damage Mechanisms": "1) Worn\n2) Deformed\n3) Cracked",
    "Failure Modes": "Bucket damage or loss",
    "Final Failure Mode": "Loss of product capacity",
    "Effect of Final Failure": "Reduced throughput and spillage",
    "Downtime Hrs": "",
    "Downtime Reason": "Bucket replacement",
    "Financial Impact": "",
    "Financial Severity Level": "2",
    "Overall Severity Level": "3",
    "Safety Severity Level": "2",
    "Safety Reason": "Potential for falling debris injury",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "1",
    "Community Reason":
      "Minor, temporary community impact that recovers with little intervention",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Bucket elevator - Routine bucket inspection",
    "Recommended Control Frequency Interval": "1",
    "Recommended Control Frequency Units": "Months",
  },
  // Elevator - Row 2
  {
    "Asset Type": "Elevator",
    Classification: "Bucket",
    FLOC: "FLOC S",
    Component: "Access Ways",
    "Main Function":
      "Allows personnel to access elevator areas for maintenance/operations",
    "Causes of Damage Mechanisms":
      "1) Exposure to environment / chemical attack\n2) Normal use\n3) Impact\n4) Incorrect Installation",
    "Damage Mechanisms":
      "1) Erosion\n2) Fatigue (Fracture)\n3) Deformed\n4) Loose fasteners",
    "Failure Modes": "Degraded structure integrity",
    "Final Failure Mode": "Failure to safety support Personnel",
    "Effect of Final Failure": "Potential falling personnel",
    "Downtime Hrs": "",
    "Downtime Reason": "Shut Down due Fatalities",
    "Financial Impact": "",
    "Financial Severity Level": "2",
    "Overall Severity Level": "4",
    "Safety Severity Level": "4",
    "Safety Reason":
      "Potential for serious injury or fatality if person falls from a height or into moving components\n1-5 fatalities or 1-5 chronic life threatening illnesses",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "2",
    "Community Reason":
      "Measurable but limited community impact lasting less than one month",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Routine inspection of walkways/handrails/ladders",
    "Recommended Control Frequency Interval": "3",
    "Recommended Control Frequency Units": "Month",
  },
  // Feeder - Row 1
  {
    "Asset Type": "Feeder",
    Classification: "Belt Feeder",
    FLOC: "FLOC T",
    Component: "Idlers",
    "Main Function": "Supports & Tracks and shapes conveyor belt with product",
    "Causes of Damage Mechanisms":
      "1) Insufficient Lubrication\n2) Exposure to environment / chemical attack\n3) Normal Use",
    "Damage Mechanisms": "1) Worn\n2) Seized",
    "Failure Modes": "Bearing Failure",
    "Final Failure Mode": "1) Thermal Stresss\n2) Belt Friction",
    "Effect of Final Failure": "Potential belt fire",
    "Downtime Hrs": "",
    "Downtime Reason": "Fire damage rectification",
    "Financial Impact": "",
    "Financial Severity Level": "4",
    "Overall Severity Level": "4",
    "Safety Severity Level": "1",
    "Safety Reason": "Low level impact resulting in first aid only",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "1",
    "Community Reason":
      "Minor, temporary community impact that recovers with little intervention",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Conveyor idlers - Routine Inspection",
    "Recommended Control Frequency Interval": "2",
    "Recommended Control Frequency Units": "Weeks",
  },
  // Feeder - Row 2
  {
    "Asset Type": "Feeder",
    Classification: "Belt Feeder",
    FLOC: "FLOC T",
    Component: "Conveyor Belt",
    "Main Function": "Support the product being transferred",
    "Causes of Damage Mechanisms": "1) Abrasion\n2) Foreign Object",
    "Damage Mechanisms": "1) Worn\n2) Torn",
    "Failure Modes": "Belt worn\nBelt ripped/torn",
    "Final Failure Mode": "Belt failure",
    "Effect of Final Failure": "Production Loss",
    "Downtime Hrs": "",
    "Downtime Reason": "Belt replacement",
    "Financial Impact": "",
    "Financial Severity Level": "4",
    "Overall Severity Level": "4",
    "Safety Severity Level": "1",
    "Safety Reason": "Low level impact resulting in first aid only",
    "Environmental Seveity Level": "1",
    "Environmental Reason":
      "Minor, temporary impact to the environment, where the ecosystem recovers with little intervention",
    "Community Severity Level": "1",
    "Community Reason":
      "Minor, temporary community impact that recovers with little intervention",
    "Reputation Severity Level": "1",
    "Reputation Reason": "Minor, temporary impact on company reputation",
    "Legal Severity Level": "1",
    "Legal Reason":
      "Minor, temporary impact on company legal rights or compliance",
    "Control Required": "Conveyor Belt - Conveyor belt condition inspection",
    "Recommended Control Frequency Interval": "2",
    "Recommended Control Frequency Units": "Weeks",
  },
];

export const generateSampleFMECAFile = (): Blob => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(sampleFMECAData);

  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "FMECA Analysis");

  // Write to buffer
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // Create blob
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

export const createSampleFMECAFile = (): File => {
  const blob = generateSampleFMECAFile();
  return new File([blob], "Sample_FMECA_Data.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
