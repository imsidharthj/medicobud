import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfile } from "./profile";
import { CalendarDays, Mail, User, Weight, AlertTriangle, Edit, Save, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function PersonalInformationPage() {
    const { user } = useUser();
    const { profileData, loading, error, updateProfile } = useProfile();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<any>("");
    const [saving, setSaving] = useState(false);

    // Helper functions
    const calculateAge = (dateOfBirth: string): number => {
        if (!dateOfBirth) return 0;
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return "Not provided";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const commonAllergies = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Pollen', 'Medication', 'Eggs', 'Soy', 'Tree Nuts', 'Fish'];

    // Edit handlers
    const handleEdit = (fieldKey: string, currentValue: any) => {
        setEditingField(fieldKey);
        setEditValue(currentValue || "");
    };

    const handleSave = async (fieldKey: string) => {
        setSaving(true);
        try {
            const success = await updateProfile(fieldKey, editValue);
            if (success) {
                toast.success("Profile updated successfully!");
                setEditingField(null);
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingField(null);
        setEditValue("");
    };

    // Render edit input based on field type
    const renderEditInput = (fieldKey: string) => {
        switch (fieldKey) {
            case 'gender':
                return (
                    <Select value={editValue} onValueChange={setEditValue}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                    </Select>
                );
            case 'allergies':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {commonAllergies.map((allergy) => (
                            <div key={allergy} className="flex items-center space-x-2">
                                <Checkbox
                                    id={allergy}
                                    checked={Array.isArray(editValue) && editValue.includes(allergy)}
                                    onCheckedChange={(checked) => {
                                        const currentAllergies = Array.isArray(editValue) ? editValue : [];
                                        if (checked) {
                                            setEditValue([...currentAllergies, allergy]);
                                        } else {
                                            setEditValue(currentAllergies.filter((a: string) => a !== allergy));
                                        }
                                    }}
                                />
                                <label htmlFor={allergy} className="text-sm font-medium">
                                    {allergy}
                                </label>
                            </div>
                        ))}
                    </div>
                );
            case 'date_of_birth':
                return (
                    <Input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full"
                    />
                );
            case 'weight':
                return (
                    <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                        className="w-full"
                        placeholder="Enter weight in kg"
                    />
                );
            default:
                return (
                    <Input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full"
                    />
                );
        }
    };

    // Render field with edit functionality
    const renderField = (fieldKey: string, label: string, value: string | null, icon?: React.ReactNode, readonly = false) => (
        <div className={`group relative ${icon ? 'flex items-center gap-2' : ''}`}>
            {icon}
            <div className="flex-1">
                <label className={`text-sm font-medium text-gray-500 ${icon ? '' : 'block'}`}>
                    {label}
                </label>
                
                {editingField === fieldKey ? (
                    <div className="mt-2 space-y-2">
                        {renderEditInput(fieldKey)}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="blueButton"
                                onClick={() => handleSave(fieldKey)}
                                disabled={saving}
                            >
                                <Save className="h-3 w-3 mr-1" />
                                {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={handleCancel}
                            >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-lg">{value || "Not provided"}</p>
                )}
            </div>
            
            {!readonly && editingField !== fieldKey && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0"
                    onClick={() => handleEdit(fieldKey, getRawValue(fieldKey))}
                >
                    <Edit className="h-3 w-3" />
                </Button>
            )}
        </div>
    );

    // Get raw value for editing
    const getRawValue = (fieldKey: string) => {
        switch (fieldKey) {
            case 'allergies':
                return profileData?.allergies || [];
            default:
                return profileData?.[fieldKey as keyof typeof profileData] || "";
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-medium">Personal Information</h3>
                    <p className="text-sm text-muted-foreground mt-2">Loading your profile information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-medium">Personal Information</h3>
                    <p className="text-sm text-red-500 mt-2">Error loading profile: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-medium">Personal Information</h3>
                <p className="text-sm text-muted-foreground mt-2">
                    View and edit your personal information and health profile details.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Basic Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField('first_name', 'First Name', profileData?.first_name ?? null)}
                            {renderField('last_name', 'Last Name', profileData?.last_name ?? null)}
                        </div>
                        <Separator />
                        {renderField('email', 'Email Address', profileData?.email ?? user?.emailAddresses[0]?.emailAddress ?? null, <Mail className="h-4 w-4 text-gray-500" />, true)}
                    </CardContent>
                </Card>

                {/* Personal Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            Personal Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                {renderField('date_of_birth', 'Date of Birth', formatDate(profileData?.date_of_birth || ""))}
                                {profileData?.date_of_birth && (
                                    <p className="text-sm text-gray-500 mt-1">Age: {calculateAge(profileData.date_of_birth)} years</p>
                                )}
                            </div>
                            {renderField('gender', 'Gender', profileData?.gender ? profileData.gender.replace('_', ' ') : null)}
                        </div>
                    </CardContent>
                </Card>

                {/* Health Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Weight className="h-5 w-5" />
                            Health Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderField('weight', 'Weight', profileData?.weight ? `${profileData.weight} kg` : null)}
                        
                        <Separator />
                        
                        <div className="group relative">
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Allergies
                            </label>
                            
                            {editingField === 'allergies' ? (
                                <div className="mt-2 space-y-2">
                                    {renderEditInput('allergies')}
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="blueButton" onClick={() => handleSave('allergies')} disabled={saving}>
                                            <Save className="h-3 w-3 mr-1" />
                                            {saving ? "Saving..." : "Save"}
                                        </Button>
                                        <Button size="sm" variant="default" onClick={handleCancel}>
                                            <X className="h-3 w-3 mr-1" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    {profileData?.allergies && profileData.allergies.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {profileData.allergies.map((allergy, index) => (
                                                <Badge key={index} variant="secondary" className="text-sm">
                                                    {allergy.replace(/[{}]/g, '')}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-lg text-gray-500">No allergies recorded</p>
                                    )}
                                </div>
                            )}
                            
                            {editingField !== 'allergies' && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0"
                                    onClick={() => handleEdit('allergies', profileData?.allergies || [])}
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}