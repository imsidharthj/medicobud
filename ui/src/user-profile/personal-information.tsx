import { useUser } from "@clerk/clerk-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import toast from "react-hot-toast";

interface UserMetadata {
    country: string;
    state: string;
    city: string;
    postalCode: string;
    dateOfBirth: string;
    [key: string]: string;
}

interface FormValues {
    firstName: string;
    lastName: string;
    country: string;
    state: string;
    city: string;
    postalCode: string;
    dateOfBirth: string;
}

const formSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    country: z.string().min(1, "Country is required"),
    state: z.string().min(1, "State is required"),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export default function PersonalInformationPage() {
    const { user } = useUser(); // Fetch user data from Clerk

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            country: "",
            state: "",
            city: "",
            postalCode: "",
            dateOfBirth: "",
        },
    });

    useEffect(() => {
        if (user) {
            const metadata = user.unsafeMetadata as unknown as UserMetadata; // Fix type conversion
            form.reset({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                country: metadata?.country || "",
                state: metadata?.state || "",
                city: metadata?.city || "",
                postalCode: metadata?.postalCode || "",
                dateOfBirth: metadata?.dateOfBirth || "",
            });
        }
    }, [user, form]);

    async function onSubmit(values: FormValues) {
        try {
            const metadata: UserMetadata = {
                country: values.country,
                state: values.state,
                city: values.city,
                postalCode: values.postalCode,
                dateOfBirth: values.dateOfBirth,
            };

            await user?.update({
                firstName: values.firstName,
                lastName: values.lastName,
                unsafeMetadata: metadata,
            });

            toast.success("Profile updated successfully"); // Use toast for success message
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile"); // Use toast for error message
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-medium">Personal Information</h3>
                <p className="text-sm text-muted-foreground mt-2">
                    Provide as much or as little information as you&apos;d like. We will never share or sell individual
                    personal information or personally identifiable details.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a country" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="us">United States</SelectItem>
                                        <SelectItem value="ca">Canada</SelectItem>
                                        <SelectItem value="uk">United Kingdom</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Province/State</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a state" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ny">New York</SelectItem>
                                        <SelectItem value="ca">California</SelectItem>
                                        <SelectItem value="tx">Texas</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Postal/Zip Code</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="YYYY-MM-DD" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Save</Button>
                </form>
            </Form>
        </div>
    );
}