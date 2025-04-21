import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { CalendarIcon, FileUp, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Define the form schema
const labReportSchema = z.object({
  reportName: z.string().min(2, "Report name is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  reportDate: z.date({
    required_error: "Report date is required",
  }),
  reportType: z.string().min(1, "Report type is required"),
  notes: z.string().optional(),
  // We'll handle file validation separately
});

// Define the type based on the schema
type LabReportFormValues = z.infer<typeof labReportSchema>;

// Props interface
interface LabReportFormProps {
  doctorId?: string;
  handleSubmit: (data: LabReportFormValues & { file?: File }) => void;
  onCancel?: () => void;
  doctors: { id: string; name: string }[];
}

export default function LaboratoryReportForm({ 
  doctorId, 
  handleSubmit, 
  onCancel,
  doctors 
}: LabReportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Initialize the form
  const form = useForm<LabReportFormValues>({
    resolver: zodResolver(labReportSchema),
    defaultValues: {
      reportName: "",
      doctorId: doctorId || "",
      reportDate: new Date(),
      reportType: "",
      notes: "",
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("File must be PDF, JPEG, or PNG");
      setSelectedFile(null);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size must be less than 10MB");
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  // Handle form submission
  const onSubmit = (values: LabReportFormValues) => {
    if (!selectedFile) {
      setFileError("Please upload a file");
      return;
    }
    
    // Call the handleSubmit function from props with form values and file
    handleSubmit({
      ...values,
      file: selectedFile,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-blue-100 shadow-lg">
      <CardHeader className="bg-blue-500 text-white rounded-t-lg">
        <CardTitle className="text-xl">Add Laboratory Report</CardTitle>
        <CardDescription className="text-blue-100">
          Upload and save your lab report information
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="E.g., Blood Test, X-Ray, etc." 
                        {...field} 
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-blue-200 focus:border-blue-500">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="blood_test">Blood Test</SelectItem>
                        <SelectItem value="imaging">Imaging (X-Ray, MRI, etc.)</SelectItem>
                        <SelectItem value="pathology">Pathology</SelectItem>
                        <SelectItem value="cardiology">Cardiology</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-blue-200 focus:border-blue-500">
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"blueButton"}
                            className={cn(
                              "pl-3 text-left font-normal border-blue-200 focus:border-blue-500",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional information about this report" 
                      className="min-h-24 border-blue-200 focus:border-blue-500" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Upload Report File</FormLabel>
              <div className="border-2 border-dashed border-blue-200 rounded-md p-6 flex flex-col items-center justify-center">
                {!selectedFile ? (
                  <>
                    <FileUp className="h-10 w-10 text-blue-500 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">
                      Drag and drop your file here or click to browse
                    </p>
                    <p className="text-xs text-gray-400">
                      Supported formats: PDF, JPEG, PNG (max 10MB)
                    </p>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 border-blue-300 text-blue-500 hover:bg-blue-50"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      Browse Files
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full bg-blue-50 p-3 rounded-md">
                    <div className="flex items-center">
                      <FileUp className="h-5 w-5 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-500"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {fileError && <p className="text-sm text-red-500">{fileError}</p>}
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t border-blue-100 py-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          onClick={form.handleSubmit(onSubmit)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Save Report
        </Button>
      </CardFooter>
    </Card>
  );
}