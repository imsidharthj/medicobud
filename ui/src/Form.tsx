import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form as ShadcnForm,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  age: z.string().min(1, {
    message: "Age is required.",
  }).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 1 && num <= 100;
  }, {message: 'Age must be in range of 1 to 100.'}),
  allergies: z.string().optional(),
  symptoms: z.array(z.string()).min(1, {
    message: "At least one symptom is required.",
  }),
});

interface FormProps {
  name: string;
  age: string;
  allergies: string;
  symptoms: string[];
  formErrors: {
    name: string;
    age: string;
    symptoms: string[];
    allergies: string;
  };
  setName: (value: string) => void;
  setAge: (value: string) => void;
  setAllergies: (value: string) => void;
  setSymptoms: (value: string[]) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function Form({
  name,
  age,
  allergies,
  symptoms,
  formErrors,
  setName,
  setAge,
  setAllergies,
  setSymptoms,
  handleSubmit,
}: FormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name,
      age,
      allergies,
      symptoms,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setName(data.name);
    setAge(data.age);
    setAllergies(data.allergies || '');
    setSymptoms(data.symptoms);
    handleSubmit(new Event('submit') as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
        <CardDescription className='text-gray-600'>Please fill out the form below to get your diagnosis</CardDescription>
      </CardHeader>
      <CardContent>
        <ShadcnForm {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {[0, 1, 2].map((index) => (
              <FormField
                key={index}
                control={form.control}
                name={`symptoms.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptom {index + 1}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </ShadcnForm>
      </CardContent>
    </Card>
  );
}

export default Form;