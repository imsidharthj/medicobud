import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Doctor name must be at least 2 characters.",
  }),
  specialty: z.string().min(2, {
    message: "Specialty must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  contactNumber: z.string().min(10, {
    message: "Contact number must be valid.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDoctorFormProps {
  handleSubmit: (data: FormValues) => Promise<void>;
}

export function AddDoctorForm({ handleSubmit }: AddDoctorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      specialty: "",
      location: "",
      contactNumber: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      await handleSubmit(data);
      
      toast.success("Doctor added successfully", {
        description: `${data.name} has been added to your doctors list.`
      });
      
      form.reset();
    } catch (error) {
        toast.error("Error", {
            description: "Failed to add doctor. Please try again."
          });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-blue-600">Add New Doctor</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">Doctor Name</Label>
          <Input 
            id="name"
            {...form.register("name")} 
            className="mt-1 block w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="specialty" className="text-sm font-medium text-gray-700">Specialty</Label>
          <Input 
            id="specialty"
            {...form.register("specialty")} 
            className="mt-1 block w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
          {form.formState.errors.specialty && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.specialty.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
          <Input 
            id="location"
            {...form.register("location")} 
            className="mt-1 block w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
          {form.formState.errors.location && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.location.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700">Contact Number</Label>
          <Input 
            id="contactNumber"
            {...form.register("contactNumber")} 
            className="mt-1 block w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
          />
          {form.formState.errors.contactNumber && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.contactNumber.message}</p>
          )}
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSubmitting ? "Adding..." : "Add Doctor"}
        </Button>
      </form>
    </div>
  );
}