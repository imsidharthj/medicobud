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

// Define the structure of user metadata
interface UserMetadata {
    country: string;
    state: string;
    city: string;
    postalCode: string;
    dateOfBirth: string;
    [key: string]: string; // Allow additional fields
}

// Define the form schema using Zod
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

    // Initialize the form with default values
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            country: "",
            state: "",
            city: "",
            postalCode: "",
            dateOfBirth: "",
        },
    });

    // Populate the form with user data when the component mounts or user changes
    useEffect(() => {
        if (user) {
            const metadata = user.unsafeMetadata as UserMetadata; // Fetch metadata from Clerk
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

    // Handle form submission
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) {
            toast.error("User not found. Please sign in.");
            return;
        }

        try {
            // Update user's first and last name
            await user.update({
                firstName: values.firstName,
                lastName: values.lastName,
            });

            // Update user's metadata
            const metadata: UserMetadata = {
                country: values.country,
                state: values.state,
                city: values.city,
                postalCode: values.postalCode,
                dateOfBirth: values.dateOfBirth,
            };
            await user.update({
                unsafeMetadata: metadata,
            });

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile. Please try again.");
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
                    {/* First Name */}
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

                    {/* Last Name */}
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

                    {/* Country */}
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

                    {/* State */}
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

                    {/* City */}
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

                    {/* Postal Code */}
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

                    {/* Date of Birth */}
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

                    {/* Submit Button */}
                    <Button type="submit">Save</Button>
                </form>
            </Form>
        </div>
    );
}