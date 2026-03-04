import React, { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MoreHorizontal, Plus, Search, Filter, UserPlus, ArrowUpDown, Trash2, Edit } from "lucide-react";
import ProductForm from "./forms/ProductForm";
import { getAllProduct, deleteProduct } from "@/services/Service";
import { formatDate } from "@/services/allFunctions";
import { useToast } from "@/hooks/use-toast";
import DeleteCard from "@/components/cards/DeleteCard";
import { Helmet } from "react-helmet-async";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getProductList } from "@/redux-toolkit/slice/lead-portal/productSlice";


const ProductList: React.FC = () => {
    const [search, setSearch] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [productListRefresh, setProductListRefresh] = useState(false);
    // const [productList, setProductList] = useState([]);
    const [initialData, setInitialData] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const dispatch = useAppDispatch();
    const productList = useAppSelector((state)=> state?.product?.productList)

    const { toast } = useToast();

    const filteredProductList = useMemo(() => {
        return productList?.filter(
            (product) =>
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.price.toLowerCase().includes(search.toLowerCase())
        );
    }, [productList, search]);

    const handleDeleteProduct = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteProduct(selectedProductId);
            if (res.status === 200 || res.status === 201) {
                toast({ title: "Delete Product", description: res?.data?.message });
                setProductListRefresh(true);
            }
        } catch (error) {
            console.log(error);
            toast({ title: "Delete Product", description: error?.response?.data?.message, variant: "destructive" });
        }
        finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    }

    const handleGetProductList = async () => {
        const res = await getAllProduct();
        // setProductList(res?.data?.data);
        dispatch(getProductList(res?.data?.data));
        setProductListRefresh(false);
    };

    useEffect(() => {
        if (productList?.length === 0 || productListRefresh) {
            handleGetProductList();
        }
    }, [productListRefresh]);
    return (
        <>
            <DeleteCard
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDeleteProduct}
                isDeleting={isDeleting}
                title="Delete Product?"
                message="This Action Will Permanently Delete This Product."
            />
            <ProductForm
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                setProductListRefresh={setProductListRefresh}
                initialData={initialData}
            />
            <Helmet title="Product List" />
            <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
                <div className="flex  justify-end gap-4 mt-[-49px]">
                 
                    <Button
                        onClick={() => { setInitialData(null); setIsAddDialogOpen(true) }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add New Product
                    </Button>
                </div>

                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b pb-4 px-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search leads by name, email, or course..."
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
                                        <TableHead className="font-semibold text-slate-700">Product Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Product Price</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                                        <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProductList.length > 0 ? (
                                        filteredProductList.map((product) => (
                                            <TableRow key={product._id} className="hover:bg-slate-50/80 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                                                            {product.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{product.name}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    ₹ {product.price}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(product.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={() => { setInitialData(product); setIsAddDialogOpen(true) }} className="cursor-pointer">
                                                                <Edit className="mr-2 h-4 w-4" /> Edit Product
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                                                onClick={() => { setSelectedProductId(product._id); setIsDeleteDialogOpen(true) }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
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
                                                    <UserPlus className="h-10 w-10 mb-2 opacity-20" />
                                                    <p>No leads found matching your search.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default ProductList;