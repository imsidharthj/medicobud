import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useUser } from "@clerk/clerk-react"; // Import Clerk's useUser hook
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
import toast from "react-hot-toast"; // For toast notifications

// Define the form schema using Zod
const formSchema = z
  .object({
    currentPassword: z.string().min(8, "Password must be at least 8 characters."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function SecurityPage() {
  const { user } = useUser(); // Fetch user data from Clerk
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast.error("User not found. Please sign in.");
      return;
    }

    try {
      // Update the user's password using Clerk
      await user.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      toast.success("Password updated successfully!"); // Show success toast
      form.reset(); // Reset the form after successful submission
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password. Please try again."); // Show error toast
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-medium">Password & Security</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Update your password and manage your account security with two-factor authentication.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Current Password */}
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword.current ? "text" : "password"}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPassword((prev) => ({ ...prev, current: !prev.current }))
                      }
                    >
                      {showPassword.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New Password */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword.new ? "text" : "password"}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPassword((prev) => ({ ...prev, new: !prev.new }))
                      }
                    >
                      {showPassword.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm New Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword.confirm ? "text" : "password"}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Buttons */}
          <div className="flex justify-between items-center">
            <Button type="submit">Change Password</Button>
            <Button variant="link" className="text-blue-500">
              Forgot Password?
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}