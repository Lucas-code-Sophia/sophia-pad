-- Clear existing tables
DELETE FROM public.tables;

-- Insert Terrace tables (T1-T36)
-- Top row (8 tables)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('T1', 4, 50, 50, 'available', 'T'),
('T2', 4, 150, 50, 'available', 'T'),
('T3', 4, 250, 50, 'available', 'T'),
('T4', 4, 350, 50, 'available', 'T'),
('T5', 4, 450, 50, 'available', 'T'),
('T6', 4, 550, 50, 'available', 'T'),
('T7', 4, 650, 50, 'available', 'T'),
('T8', 4, 750, 50, 'available', 'T');

-- Second row (8 tables)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('T9', 4, 50, 150, 'available', 'T'),
('T10', 4, 150, 150, 'available', 'T'),
('T11', 4, 250, 150, 'available', 'T'),
('T12', 4, 350, 150, 'available', 'T'),
('T13', 4, 450, 150, 'available', 'T'),
('T14', 4, 550, 150, 'available', 'T'),
('T15', 4, 650, 150, 'available', 'T'),
('T16', 4, 750, 150, 'available', 'T');

-- Third row (8 tables)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('T17', 4, 50, 250, 'available', 'T'),
('T18', 4, 150, 250, 'available', 'T'),
('T19', 4, 250, 250, 'available', 'T'),
('T20', 4, 350, 250, 'available', 'T'),
('T21', 4, 450, 250, 'available', 'T'),
('T22', 4, 550, 250, 'available', 'T'),
('T23', 4, 650, 250, 'available', 'T'),
('T24', 4, 750, 250, 'available', 'T');

-- Middle section (12 tables)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('T25', 4, 400, 380, 'available', 'T'),
('T26', 4, 500, 380, 'available', 'T'),
('T27', 4, 600, 380, 'available', 'T'),
('T28', 4, 700, 380, 'available', 'T'),
('T29', 4, 400, 480, 'available', 'T'),
('T30', 4, 500, 480, 'available', 'T'),
('T31', 4, 600, 480, 'available', 'T'),
('T32', 4, 700, 480, 'available', 'T'),
('T33', 4, 400, 580, 'available', 'T'),
('T34', 4, 500, 580, 'available', 'T'),
('T35', 4, 600, 580, 'available', 'T'),
('T36', 4, 700, 580, 'available', 'T');

-- Insert Canapé tables (C1-C2)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('C1', 6, 50, 520, 'available', 'C'),
('C2', 6, 200, 520, 'available', 'C');

-- Insert Interior tables (I1-I26)
-- Left column
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('I1', 4, 120, 800, 'available', 'I'),
('I2', 4, 220, 800, 'available', 'I'),
('I3', 4, 120, 900, 'available', 'I'),
('I4', 4, 220, 900, 'available', 'I'),
('I5', 4, 120, 1000, 'available', 'I'),
('I6', 4, 220, 1000, 'available', 'I'),
('I7', 4, 120, 1100, 'available', 'I'),
('I8', 4, 220, 1100, 'available', 'I'),
('I9', 4, 120, 1200, 'available', 'I'),
('I10', 4, 220, 1200, 'available', 'I');

-- Middle column
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('I11', 4, 360, 900, 'available', 'I'),
('I12', 4, 460, 900, 'available', 'I'),
('I13', 4, 360, 1050, 'available', 'I'),
('I14', 4, 460, 1050, 'available', 'I');

-- Right column
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('I15', 4, 600, 750, 'available', 'I'),
('I16', 4, 700, 750, 'available', 'I'),
('I17', 4, 600, 850, 'available', 'I'),
('I18', 4, 700, 850, 'available', 'I'),
('I19', 4, 600, 950, 'available', 'I'),
('I20', 4, 700, 950, 'available', 'I'),
('I21', 4, 600, 1050, 'available', 'I'),
('I22', 4, 700, 1050, 'available', 'I'),
('I23', 4, 600, 1200, 'available', 'I'),
('I24', 4, 700, 1200, 'available', 'I');

-- Bottom right
INSERT INTO public.tables (table_number, seats, position_x, position_y, status, location) VALUES
('I25', 4, 600, 1300, 'available', 'I'),
('I26', 4, 700, 1300, 'available', 'I');
