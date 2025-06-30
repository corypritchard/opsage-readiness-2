-- Create a trigger function to initialize default display columns for FMECA
CREATE OR REPLACE FUNCTION initialize_default_fmeca_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default columns
    INSERT INTO public.fmeca_columns (project_id, user_id, column_name, column_order)
    VALUES 
      (NEW.id, NEW.user_id, 'System', 1),
      (NEW.id, NEW.user_id, 'Asset', 2),
      (NEW.id, NEW.user_id, 'Component', 3),
      (NEW.id, NEW.user_id, 'Function', 4),
      (NEW.id, NEW.user_id, 'Failure Mode', 5),
      (NEW.id, NEW.user_id, 'Failure Effect', 6),
      (NEW.id, NEW.user_id, 'Severity', 7),
      (NEW.id, NEW.user_id, 'Cause', 8),
      (NEW.id, NEW.user_id, 'Likelihood', 9),
      (NEW.id, NEW.user_id, 'Risk', 10);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on fmeca_projects
CREATE TRIGGER initialize_fmeca_columns
AFTER INSERT ON public.fmeca_projects
FOR EACH ROW
EXECUTE FUNCTION initialize_default_fmeca_columns(); 