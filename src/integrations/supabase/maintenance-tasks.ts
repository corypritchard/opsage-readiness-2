import { supabase } from "./client";
import type { Database } from "./types";

type MaintenanceTask = Database["public"]["Tables"]["maintenance_tasks"]["Row"];
type MaintenanceTaskInsert =
  Database["public"]["Tables"]["maintenance_tasks"]["Insert"];
type MaintenanceTaskUpdate =
  Database["public"]["Tables"]["maintenance_tasks"]["Update"];

type FMECAProject = Database["public"]["Tables"]["fmeca_projects"]["Row"];
type FMECAProjectInsert =
  Database["public"]["Tables"]["fmeca_projects"]["Insert"];

type FMECAData = Database["public"]["Tables"]["fmeca_data"]["Row"];
type FMECADataInsert = Database["public"]["Tables"]["fmeca_data"]["Insert"];

type MaintenanceTaskColumn =
  Database["public"]["Tables"]["maintenance_task_columns"]["Row"];
type MaintenanceTaskColumnInsert =
  Database["public"]["Tables"]["maintenance_task_columns"]["Insert"];

type FMECAColumn = Database["public"]["Tables"]["fmeca_columns"]["Row"];
type FMECAColumnInsert =
  Database["public"]["Tables"]["fmeca_columns"]["Insert"];

// FMECA Projects
export const createFMECAProject = async (
  project: Omit<FMECAProjectInsert, "user_id">
): Promise<FMECAProject> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Temporarily exclude file_name to avoid schema cache issue
  const { file_name, ...projectWithoutFileName } = project;

  const { data, error } = await supabase
    .from("fmeca_projects")
    .insert({
      ...projectWithoutFileName,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error details:", error);
    throw new Error(`Failed to create FMECA project: ${error.message}`);
  }

  return data;
};

export const getFMECAProjects = async (): Promise<FMECAProject[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("fmeca_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch FMECA projects: ${error.message}`);
  }

  return data || [];
};

export const getFMECAProject = async (
  projectId: string
): Promise<FMECAProject> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("fmeca_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch FMECA project: ${error.message}`);
  }

  return data;
};

export const updateFMECAProject = async (
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<FMECAProject> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("fmeca_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update FMECA project: ${error.message}`);
  }

  return data;
};

// FMECA Data
export const saveFMECAData = async (
  projectId: string,
  fmecaRows: any[],
  columnOrder?: string[]
): Promise<void> => {
  console.log("saveFMECAData called with:", {
    projectId,
    rowsCount: fmecaRows.length,
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("Auth check result:", {
    userId: user?.id,
    authError: authError?.message,
  });

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if project exists and belongs to user
  const { data: project, error: projectError } = await supabase
    .from("fmeca_projects")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  console.log("Project check result:", {
    project: project?.id,
    projectUserId: project?.user_id,
    currentUserId: user.id,
    projectError: projectError?.message,
  });

  if (projectError || !project) {
    throw new Error(
      `Project not found or access denied: ${projectError?.message}`
    );
  }

  // Delete existing data and columns for this project
  console.log("Attempting to delete existing FMECA data and columns");

  const { error: deleteDataError } = await supabase
    .from("fmeca_data")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (deleteDataError) {
    console.error("Delete data error:", deleteDataError);
    throw new Error(
      `Failed to clear existing FMECA data: ${deleteDataError.message}`
    );
  }

  const { error: deleteColumnsError } = await supabase
    .from("fmeca_columns")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (deleteColumnsError) {
    console.error("Delete columns error:", deleteColumnsError);
    throw new Error(
      `Failed to clear existing FMECA columns: ${deleteColumnsError.message}`
    );
  }

  console.log("Existing data and columns cleared successfully");

  // Insert new data
  const fmecaDataInserts: FMECADataInsert[] = fmecaRows.map((row, index) => ({
    project_id: projectId,
    user_id: user.id,
    row_data: row,
    row_index: index,
  }));

  console.log("Attempting to insert FMECA data:", {
    insertsCount: fmecaDataInserts.length,
    sampleInsert: fmecaDataInserts[0],
  });

  const { error: insertError } = await supabase
    .from("fmeca_data")
    .insert(fmecaDataInserts);

  if (insertError) {
    console.error("Insert error:", insertError);
    throw new Error(`Failed to save FMECA data: ${insertError.message}`);
  }

  // Save column order if provided
  if (columnOrder && columnOrder.length > 0) {
    const columnInserts: FMECAColumnInsert[] = columnOrder.map(
      (columnName, index) => ({
        project_id: projectId,
        user_id: user.id,
        column_name: columnName,
        column_order: index,
      })
    );

    const { error: columnsInsertError } = await supabase
      .from("fmeca_columns")
      .insert(columnInserts);

    if (columnsInsertError) {
      console.error("Columns insert error:", columnsInsertError);
      throw new Error(
        `Failed to save FMECA columns: ${columnsInsertError.message}`
      );
    }

    console.log("FMECA columns saved successfully");
  }

  console.log("FMECA data saved successfully");
};

export const getFMECAData = async (
  projectId: string
): Promise<{
  data: any[];
  columns: string[];
}> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get the data
  const { data: fmecaData, error: dataError } = await supabase
    .from("fmeca_data")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("row_index", { ascending: true });

  if (dataError) {
    throw new Error(`Failed to fetch FMECA data: ${dataError.message}`);
  }

  // Get the column order
  const { data: columnData, error: columnError } = await supabase
    .from("fmeca_columns")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("column_order", { ascending: true });

  if (columnError) {
    throw new Error(`Failed to fetch FMECA columns: ${columnError.message}`);
  }

  const rowData = fmecaData?.map((row) => row.row_data) || [];
  const orderedColumns = columnData?.map((col) => col.column_name) || [];

  // If no column order is stored, fall back to extracting from first row
  let columns = orderedColumns;
  if (columns.length === 0 && rowData.length > 0) {
    columns = Object.keys(rowData[0]);
  }

  return {
    data: rowData,
    columns: columns,
  };
};

// Maintenance Tasks
export const saveMaintenanceTasks = async (
  projectId: string,
  tasks: any[],
  columns: { id: string; header: string; accessorKey: string }[]
): Promise<void> => {
  console.log("saveMaintenanceTasks called with:", {
    projectId,
    tasksCount: tasks.length,
    columnsCount: columns.length,
    sampleTask: tasks[0],
    columns,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  console.log("User authenticated:", user.id);

  // Start a transaction
  const { error: deleteTasksError } = await supabase
    .from("maintenance_tasks")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (deleteTasksError) {
    throw new Error(
      `Failed to clear existing maintenance tasks: ${deleteTasksError.message}`
    );
  }

  const { error: deleteColumnsError } = await supabase
    .from("maintenance_task_columns")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (deleteColumnsError) {
    throw new Error(
      `Failed to clear existing task columns: ${deleteColumnsError.message}`
    );
  }

  // Save column definitions
  const columnInserts: MaintenanceTaskColumnInsert[] = columns.map(
    (col, index) => ({
      project_id: projectId,
      user_id: user.id,
      column_name: col.header,
      column_order: index,
    })
  );

  const { error: columnsError } = await supabase
    .from("maintenance_task_columns")
    .insert(columnInserts);

  if (columnsError) {
    throw new Error(`Failed to save task columns: ${columnsError.message}`);
  }

  // Save tasks
  const taskInserts: MaintenanceTaskInsert[] = tasks.map((task) => {
    // Extract standard columns
    const asset = task.Asset || task.asset || "";
    const component = task.Component || task.component || "";
    const failure_mode = task["Failure Mode"] || task.failure_mode || null;
    const task_description =
      task["Task Description"] || task.task_description || "";
    const frequency = task.Frequency || task.frequency || null;
    const frequency_units =
      task["Frequency Units"] || task.frequency_units || null;
    const maintenance_type =
      task["Maintenance Type"] || task.maintenance_type || null;

    // Store any additional columns in additional_data
    const standardColumns = new Set([
      "Asset",
      "asset",
      "Component",
      "component",
      "Failure Mode",
      "failure_mode",
      "Task Description",
      "task_description",
      "Frequency",
      "frequency",
      "Frequency Units",
      "frequency_units",
      "Maintenance Type",
      "maintenance_type",
    ]);

    const additional_data: any = {};
    Object.keys(task).forEach((key) => {
      if (!standardColumns.has(key)) {
        additional_data[key] = task[key];
      }
    });

    // Handle frequency conversion more safely
    let numericFrequency = null;
    if (frequency) {
      const parsed = parseFloat(frequency);
      if (!isNaN(parsed)) {
        numericFrequency = parsed;
      }
      // If frequency is not numeric, store it in additional_data instead
      else {
        additional_data.frequency_text = frequency;
      }
    }

    const taskInsert = {
      project_id: projectId,
      user_id: user.id,
      asset,
      component,
      failure_mode,
      task_description,
      frequency: numericFrequency,
      frequency_units,
      maintenance_type,
      additional_data:
        Object.keys(additional_data).length > 0 ? additional_data : null,
    };

    console.log("Task insert object:", taskInsert);
    return taskInsert;
  });

  console.log("Inserting tasks:", taskInserts.length);

  const { error: tasksError } = await supabase
    .from("maintenance_tasks")
    .insert(taskInserts);

  if (tasksError) {
    console.error("Tasks insert error:", tasksError);
    throw new Error(`Failed to save maintenance tasks: ${tasksError.message}`);
  }

  console.log("Successfully saved maintenance tasks and columns!");
};

export const getMaintenanceTasks = async (
  projectId: string
): Promise<{
  tasks: any[];
  columns: { id: string; header: string; accessorKey: string }[];
}> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Fetch columns
  const { data: columnsData, error: columnsError } = await supabase
    .from("maintenance_task_columns")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("column_order", { ascending: true });

  if (columnsError) {
    throw new Error(`Failed to fetch task columns: ${columnsError.message}`);
  }

  // Fetch tasks
  const { data: tasksData, error: tasksError } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (tasksError) {
    throw new Error(`Failed to fetch maintenance tasks: ${tasksError.message}`);
  }

  // Convert columns back to the expected format
  const columns = (columnsData || []).map((col) => ({
    id: col.column_name,
    header: col.column_name,
    accessorKey: col.column_name,
  }));

  // Convert tasks back to the expected format
  const tasks = (tasksData || []).map((task) => {
    const baseTask: any = {
      Asset: task.asset,
      Component: task.component,
      "Task Description": task.task_description,
    };

    if (task.failure_mode) baseTask["Failure Mode"] = task.failure_mode;
    if (task.frequency) baseTask.Frequency = task.frequency;
    if (task.frequency_units)
      baseTask["Frequency Units"] = task.frequency_units;
    if (task.maintenance_type)
      baseTask["Maintenance Type"] = task.maintenance_type;

    // Add any additional data
    if (task.additional_data) {
      Object.assign(baseTask, task.additional_data);
    }

    return baseTask;
  });

  return { tasks, columns };
};

// Delete project and all associated data
export const deleteFMECAProject = async (projectId: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("fmeca_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete FMECA project: ${error.message}`);
  }
};
