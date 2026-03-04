import React, { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddManagerForm from "./forms/AddManagerForm";
import DeleteCard from "@/components/cards/DeleteCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { getTaskManager, deleteTaskManager } from "@/services/Service";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getManagers } from "@/redux-toolkit/slice/task/taskManagerSlice";
import { socket } from "@/socket/socket";


interface ManagerItem {
    _id: string;
    fullName: string;
    email: string;
    taskRoleStatus: string;
    department: string;
    profileImage: string;
}

const TaskManager: React.FC = () => {
    // const [managers, setManagers] = useState<ManagerItem[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [initialData, setInitialData] = useState<ManagerItem | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState(null);
    const [managerRefresh, setManagerRefresh] = useState(false);
    const dispatch = useAppDispatch();
    const managers = useAppSelector((state) => state.manager.managers);
    const filteredManagers = managers.filter(
        (m) =>
            m.fullName.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase()) ||
            m.department.toLowerCase().includes(search.toLowerCase()) // include department in search
    );
    useEffect(() => {
        socket.on("getEmployeeRefresh", () => {
            setManagerRefresh(true);
        });

        return () => {
            socket.off("getEmployeeRefresh");
        };
    }, []);

    const handleDeleteClick = (employeeId) => {
        console.log(employeeId)
        setSelectedManagerId(employeeId);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteTaskManager(user?._id, user?.companyId?._id, selectedManagerId);
            if (res.status === 200) {
                setManagerRefresh(true);
                toast({
                    title: "Manager Deleted",
                    description: `${res?.data?.message}`,
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: error?.response?.data?.message || "Something went wrong",
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleGetManager = async () => {
        try {
            const res = await getTaskManager(user?._id, user?.companyId?._id);
            console.log(res);
            if (res.status === 200) {
                dispatch(getManagers(res.data));
                setManagerRefresh(false);
            }
        }
        catch (err) {
            console.log(err);
            toast({ title: "Error", description: `Error := ${err.response.message}` })
        }
    };

    useEffect(() => {
        if (user?._id && (managers?.length === 0 || managerRefresh)) {
            handleGetManager();
        }
    }, [managerRefresh, user?._id, managers?.length]);

    return (
        <>
            <AddManagerForm
                isOpen={isFormOpen}
                onIsOpenChange={() => setIsFormOpen(false)}
                initialData={initialData}
                setManagerRefresh={setManagerRefresh}
            />
            <DeleteCard
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                title="Remove Manager"
                message="Are you sure you want to remove this manager?"
            />

            <div className="flex flex-col md:mt-[-30px] min-h-screen bg-gray-50/50 p-3 sm:p-6 space-y-6 max-w-[100vw] sm:max-w-none">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <div className="flex flex-row items-center justify-between">
                                <span>Manager List</span>
                                <Button
                                    className="w-full sm:w-auto"
                                    onClick={() => { setInitialData(null); setIsFormOpen(true); }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Manager
                                </Button>
                            </div>

                        </CardTitle>
                        <CardDescription>
                            All managers with contact information and departments.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {/* Search */}
                        <div className="relative flex-1 mb-4">
                            <Input
                                placeholder="Search managers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {/* Table */}
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Profile Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredManagers.length ? (
                                        filteredManagers.map((manager) => (
                                            <TableRow key={manager._id}> {/* Use _id as key */}
                                                <TableCell>
                                                    <img
                                                        src={manager.profileImage}
                                                        alt={manager.fullName}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">{manager.fullName}</TableCell>
                                                <TableCell>{manager.email}</TableCell>
                                                <TableCell> <span className={`px-3 py-1 rounded-full text-sm font-medium ${manager.taskRoleStatus === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`} >{manager.taskRoleStatus.charAt(0).toUpperCase() + manager.taskRoleStatus.slice(1)}</span></TableCell>
                                                <TableCell>{manager.department}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            <DropdownMenuItem
                                                                className="flex items-center gap-2 cursor-pointer"
                                                                onClick={() => {
                                                                    setInitialData(manager);
                                                                    setIsFormOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4 text-green-600" />
                                                                Edit
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            <DropdownMenuItem
                                                                className="flex items-center gap-2 text-red-600 cursor-pointer"
                                                                onClick={() => {
                                                                    handleDeleteClick(manager._id); // Use _id here too
                                                                    setIsDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                No managers found
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

export default TaskManager;
