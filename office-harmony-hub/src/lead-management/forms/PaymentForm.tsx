import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { updateLeadPayment } from "@/services/Service";

const PaymentForm = ({ isOpen, onOpenChange, initialData, setLeadListRefresh }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        amountPaid: "",
        paymentMode: ""
    });

    const resetForm = () => {
        setFormData({ amountPaid: "", paymentMode: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const payload = {
                leadId: initialData?._id,
                amountPaid: Number(formData.amountPaid),
                paymentMode: formData.paymentMode
            };

            const res = await updateLeadPayment(payload);

            if (res.status === 200 || res.status === 201) {
                toast({
                    title: "Payment Added",
                    description: res?.data?.message
                });
                setLeadListRefresh(true);
                resetForm();
                onOpenChange(false);
            }
        } catch (err) {
            toast({
                title: "Payment Error",
                description: err?.response?.data?.message || err?.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

   return (
    <Dialog
        open={isOpen}
        onOpenChange={(open) => {
            resetForm();
            onOpenChange(open);
        }}
    >
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
                <DialogDescription>
                    Add payment details for enrolled lead.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={initialData?.name} disabled />
                    </div>

                    <div>
                        <Label className="text-xs">Email</Label>
                        <Input value={initialData?.email} disabled />
                    </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">Phone</Label>
                        <Input value={initialData?.phone} disabled />
                    </div>

                    <div>
                        <Label className="text-xs">Course</Label>
                        <Input value={initialData?.product?.name} disabled />
                    </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">Total Price (₹)</Label>
                        <Input value={initialData?.price} disabled />
                    </div>

                    <div>
                        <Label className="text-xs">Amount Paid (₹)</Label>
                        <Input
                            type="number"
                            value={formData.amountPaid}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    amountPaid: e.target.value,
                                })
                            }
                            placeholder="Enter Amount Paid"
                        />
                    </div>
                </div>

                {/* Row 4 - Full Width */}
                <div>
                    <Label className="text-xs">Payment Mode</Label>
                    <Select
                        value={formData.paymentMode}
                        onValueChange={(value) =>
                            setFormData({
                                ...formData,
                                paymentMode: value,
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Payment Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="bank_transfer">
                                Bank Transfer
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        disabled={
                            loading ||
                            !formData.amountPaid ||
                            !formData.paymentMode
                        }
                    >
                        {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {loading ? "Adding..." : "Add Payment"}
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
);
};

export default PaymentForm;