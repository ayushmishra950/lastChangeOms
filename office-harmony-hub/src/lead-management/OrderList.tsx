import React, { useState,useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Search,
  Mail,
  Phone,
  Filter,
  ArrowUpDown,
  Trash2,
  Eye,
  Download,
  CreditCard,
  Calendar,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { getAllLead, deleteLead, updateLeadPaymentStatus } from "@/services/Service";
import{formatDate} from "@/services/allFunctions";
import { useToast } from "@/hooks/use-toast";
import DeleteCard from "@/components/cards/DeleteCard";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getLeadList } from "@/redux-toolkit/slice/lead-portal/leadSlice";

export type PaymentStatus = "paid" | "pending" | "failed" | "partial";

export type Order = {
  id: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  course: string;
  amount: number;
  paymentStatus: PaymentStatus;
  orderDate: string;
};


const paymentStatusColors: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusOrder = ["pending", "partial", "paid", "failed"];

const OrderList: React.FC = () => {
  const {toast} = useToast();
  const [orders, setOrders] = useState<Order[]>();
  // const [orderList, setOrderList] = useState([]);
  const [orderListRefresh, setOrderListRefresh] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
      const [isStatusLoading, setIsStatusLoading] = useState(false);
      const [statusData, setStatusData] = useState({ id: "",paymentId:"", status: "pending" });
      const currentStatusIndex = statusOrder.indexOf(statusData?.status);
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const dispatch = useAppDispatch();
  const orderList = useAppSelector((state)=> state?.lead?.leadList);
  
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return orderList?.filter((v)=> v?.status==="enrolled").filter(
      (order) =>
        order.name.toLowerCase().includes(search.toLowerCase()) ||
        order.email.toLowerCase().includes(search.toLowerCase()) ||
        order.phone.toLowerCase().includes(search.toLowerCase()) ||
        order.product?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [orderList, search]);
  console.log(filteredOrders)

  const handleDeleteOrder = async () => {
      setIsDeleting(true);
      try {
        const res = await deleteLead(selectedOrderId);
        if (res.status === 200) {
          toast({ title: "Delete Lead", description: res?.data?.message });
          setOrderListRefresh(true);
        }
      } catch (error) {
        console.log(error);
        toast({ title: "Delete Lead", description: error?.response?.data?.message, variant: "destructive" });
      }
      finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    }

   const handleUpdateLeadStatus = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsStatusLoading(true);
      let obj = {
        leadId: statusData?.id, paymentId:statusData?.paymentId, status:statusData?.status
      }
      try {
        const res = await updateLeadPaymentStatus(obj);
        if (res.status === 200) {
          toast({ title: "Update Lead Status", description: res?.data?.message });
          setOrderListRefresh(true);
        }
      } catch (error) {
        console.log(error);
        toast({ title: "Update Lead Status", description: error?.response?.data?.message, variant: "destructive" });
      }
      finally {
        setIsStatusLoading(false);
        setIsStatusDialogOpen(false);
      }
    }
  

   const handleGetOrderList = async () => {
      try {
        const res = await getAllLead();
        console.log(res)
        if (res.status === 200) {
          // setOrderList(res?.data?.data);
          dispatch(getLeadList(res?.data?.data))
          setOrderListRefresh(false);
        }
      }
      catch (err) {
        console.log(err);
      }
    };
  
    useEffect(() => {
      if (orderListRefresh || orderList?.length === 0) {
        handleGetOrderList();
      }
    }, [orderListRefresh, orderList?.length]);

  return (
    <>
     <DeleteCard
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleDeleteOrder}
            isDeleting={isDeleting}
            title="Delete Lead?"
            message="This Action Will Permanently Delete This Lead."
          />

    <Helmet title="OrderList" />
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
        <div className="flex justify-end gap-3 mt-[-48px]">
          <Button variant="outline" className="bg-white">
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{orderList?.filter(o => o?.payment?.paymentStatus === "paid").reduce((acc, curr) => acc + curr?.payment?.amountPaid, 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">From successful enrollments</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {orderList?.filter(o => o?.payment?.paymentStatus === "paid").length}
            </div>
            <p className="text-xs text-indigo-600 mt-1 font-medium">Students currently enrolled</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {orderList?.filter(o => o?.payment?.paymentStatus === "pending").length}
            </div>
            <p className="text-xs text-yellow-600 mt-1 font-medium">Awaiting payment verification</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b pb-4 px-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, order ID, or course..."
                className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-slate-600">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="text-slate-600">
                <ArrowUpDown className="mr-2 h-4 w-4" /> Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Order ID</TableHead>
                  <TableHead className="font-semibold text-slate-700">Student</TableHead>
                  <TableHead className="font-semibold text-slate-700">Course & Price</TableHead>
                   <TableHead className="font-semibold text-slate-700">Amount Paid</TableHead>
                  <TableHead className="font-semibold text-slate-700">Payment Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Date</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order._id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                        ORD-{new Date()?.getFullYear()}-{order?._id?.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                            {order?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{order?.name}</p>
                            <p className="text-xs text-slate-500">{order?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-800">{order?.product?.name}</p>
                          <p className="text-xs font-semibold text-slate-600">₹{order.price.toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order?.payment?.amountPaid}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="focus:outline-none">
                              <Badge className={`${paymentStatusColors[order.payment?.paymentStatus]} border cursor-pointer hover:opacity-80 transition-opacity`}>
                                {order?.payment.paymentStatus}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-3 w-3 opacity-50" />
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Order Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                          { order?.payment?.paymentStatus !=="paid" && order?.payment?.paymentStatus !=="failed" &&  <DropdownMenuItem onClick={()=>{setStatusData({id:order?._id,paymentId:order?.payment?._id, status:order?.payment?.paymentStatus});setIsStatusDialogOpen(true)}} className="cursor-pointer">
                              <CreditCard className="mr-2 h-4 w-4" /> Update Payment Status
                            </DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={() => {setSelectedOrderId(order?._id); setIsDeleteDialogOpen(true)}}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Search className="h-10 w-10 mb-2 opacity-20" />
                        <p>No orders found matching your search.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

       <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Lead Status</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateLeadStatus}>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusData?.status} onValueChange={(value) => { setStatusData({ ...statusData, status: value }) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOrder.map((statusValue) => {
                          const optionIndex = statusOrder.indexOf(statusValue);
                          const isDisabled = optionIndex < currentStatusIndex;
      
                          return (
                            <SelectItem
                              key={statusValue}
                              value={statusValue}
                              disabled={isDisabled}
                              className="cursor-pointer"
                            >
                              {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end mt-6">
                      <Button type="submit">
                        {isStatusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Status"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
      
    </div>
    </>
  );
};

export default OrderList;