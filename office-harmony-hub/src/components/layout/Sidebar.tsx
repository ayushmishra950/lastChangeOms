
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FolderKanban, LogOut, Menu, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarProps, navItems, taskSubMenu, JobSubMenu, LeadSubMenu } from "@/services/allFunctions";
import { useAuth } from '@/contexts/AuthContext';
import { createPortal } from 'react-dom';

const Sidebar: React.FC<SidebarProps> = ({ setTaskName, setJobName, isOpen, onToggle, setActiveSidebar, setTaskSubPage, setJobSubPage, setLeadSubPage, setLeadName }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const jobDropdownRef = useRef<HTMLDivElement>(null);
  const leadDropdownRef = useRef<HTMLDivElement>(null);

  // Default sidebar open
  const [isLocalOpen, setLocalOpen] = useState<boolean>(isOpen);

  // Submenus
  const [showTaskSubMenu, setShowTaskSubMenu] = useState(false);
  const [showJobSubMenu, setShowJobSubMenu] = useState(false);
  const [showLeadSubMenu, setShowLeadSubMenu] = useState(false);

  const [dropdownPos, setDropdownPos] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [jobDropdownPos, setJobDropdownPos] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [leadDropdownPos, setLeadDropdownPos] = useState<{ top: number, left: number }>({ top: 0, left: 0 });



  const handleTaskMouseEnter = (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.top, left: rect.right }); // dropdown sidebar ke right me appear hoga
    setShowTaskSubMenu(true);
  };

  const handleTaskMouseLeave = () => {
    setShowTaskSubMenu(false);
  };

  const handleJobMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setShowJobSubMenu(true);

    setTimeout(() => {
      if (jobDropdownRef.current) {
        const dropdownHeight = jobDropdownRef.current.offsetHeight;
        const spaceBelow = window.innerHeight - rect.top;

        let topPosition = rect.top;

        if (spaceBelow < dropdownHeight) {
          topPosition = rect.bottom - dropdownHeight;
        }

        setJobDropdownPos({
          top: topPosition,
          left: rect.right
        });
      }
    }, 0);
  };


  const handleJobMouseLeave = () => setShowJobSubMenu(false);


  const handleLeadMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setShowLeadSubMenu(true);

    setTimeout(() => {
      if (leadDropdownRef.current) {   // ✅ correct ref
        const dropdownHeight = leadDropdownRef.current.offsetHeight;
        const spaceBelow = window.innerHeight - rect.top;

        let topPosition = rect.top;

        if (spaceBelow < dropdownHeight) {
          topPosition = rect.bottom - dropdownHeight;
        }

        setLeadDropdownPos({           // ✅ correct state
          top: topPosition,
          left: rect.right
        });
      }
    }, 0);
  };

  const handleLeadMouseLeave = () => setShowLeadSubMenu(false);


  // Toggle sidebar: call both local state and parent callback
  const toggleSidebar = () => {
    setLocalOpen(prev => !prev); // for internal animation
    onToggle();                  // call parent so main content adjusts width
  };
  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const effectiveRole = user?.role === "admin" ? "admin" :
    user?.role === "employee" && user?.taskRole === "manager" ? "manager" : "employee";

  const filteredTaskSubMenu = taskSubMenu.filter(sub => sub.roles.includes(effectiveRole));
  const filteredLeadSubMenu = LeadSubMenu.filter(sub => sub.roles.includes(effectiveRole));

  const getRoleBadge = (role: string) => {
    const roleLabels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      employee: user?.taskRole === "manager" ? `Department Manager(${user?.department})` : `Employee ${user?.department}`,
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  useEffect(() => {
    if (!isOpen) {
      setShowTaskSubMenu(false);
      setShowJobSubMenu(false);
      setShowLeadSubMenu(false); // ✅ add this
    }
  }, [isOpen]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col bg-sidebar shadow-lg transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : "w-16"
        )}
      >
        {/* Top Menu Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {isOpen && (
            <div className='flex items-center justify-between gap-2'>
              <img className='w-9 h-9 rounded'
                src={user?.companyId?.logo || user?.createdBy?.logo || "https://imgs.search.brave.com/fyjiYJDWqHKM10ialxrNUXefvIkntePcZxIe4bW0UkY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93MC5w/ZWFrcHguY29tL3dh/bGxwYXBlci82MDAv/NzA3L0hELXdhbGxw/YXBlci1zLWctbmFh/bS1rZS1nb2xkLXMt/Zy1nb2xkLXNnLWxl/dHRlci1zZy5qcGc"} />
              <h1 className="font-bold text-lg text-sidebar-foreground truncate">
                {user?.companyId?.name || user?.createdBy?.name || 'Super Admin'}
              </h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-sidebar-accent/20"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className={cn("p-4 border-b border-sidebar-border transition-all", !isOpen && "justify-center flex items-center")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="font-semibold text-sidebar-accent-foreground">
                  {user.username?.charAt(0) || user.fullName?.charAt(0)}
                </span>
              </div>
              {isOpen && (
                <div>
                  <p className="text-sm text-white font-medium truncate">{user.username || user.fullName}</p>
                  <p className="text-xs text-sidebar-primary">{getRoleBadge(user.role)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 relative">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map(item => {
              const isTasksActive = location.pathname.startsWith("/tasks");
              const isJobPortalActive = location.pathname.startsWith("/jobs");
              const isLeadPortalActive = location.pathname.startsWith("/leads");
              const isThisActive = location.pathname === item.path;

              const renderItem = (itemLabel: string) => (
                <NavLink
                  to={item.path}
                  onClick={() => { setTaskName(""); setJobName(""); setLeadName(""); setActiveSidebar(item.label) }}
                  className={cn(
                    "sidebar-item flex items-center justify-between p-2",
                    (itemLabel === "Tasks" && isTasksActive) ||
                      (itemLabel === "Job-Portal" && isJobPortalActive)
                      || (itemLabel === "Lead-Portal" && isLeadPortalActive) || isThisActive
                      ? "bg-blue-600 text-white font-semibold"
                      : "",
                    !isOpen && "justify-center"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span>{item.label === "Employees" ? user?.role === "super_admin" ? "Admins" : "Employees" : item?.label}</span>}
                  </div>

                  {/* Arrow only for Tasks & Job-Portal */}
                  {isOpen && (item.label === "Tasks" || item.label === "Job-Portal" || item.label === "Lead-Portal") && (
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        item.label === "Tasks" && showTaskSubMenu && "rotate-90",
                        item.label === "Job-Portal" && showJobSubMenu && "rotate-90",
                        item.label === "Lead-Portal" && showLeadSubMenu && "rotate-90"
                      )}
                    />
                  )}
                </NavLink>
              );


              // Tasks Dropdown
              if (item.label === "Tasks") {
                return (
                  <li
                    key={item.path}
                    onMouseEnter={() => isOpen && setShowTaskSubMenu(true)}
                    onMouseLeave={() => setShowTaskSubMenu(false)}
                  >
                    {renderItem(item.label)}

                    {showTaskSubMenu && createPortal(
                      <div
                        style={{ top: dropdownPos.top, left: dropdownPos.left }}
                        className="fixed w-48 bg-sidebar shadow-lg border border-sidebar-border z-50 md:ml-56 md:mt-52"
                        onMouseEnter={() => setShowTaskSubMenu(true)}
                        onMouseLeave={handleTaskMouseLeave}
                      >
                        <ul>
                          {filteredTaskSubMenu.map(sub => (
                            <li key={sub.path}>
                              <NavLink
                                to={sub.path}
                                onClick={() => { setTaskName("Tasks"); setTaskSubPage(sub?.label); }}
                                end={sub.path === "/tasks"} // only for dashboard
                                className={({ isActive }) => cn(
                                  "block px-4 py-2 text-sm text-white hover:bg-sidebar-accent",
                                  isActive && "bg-sidebar-accent font-medium"
                                )}
                              >
                                {sub.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>,
                      document.body
                    )}

                  </li>
                );
              }

              // Job Dropdown
              if (item.label === "Job-Portal") {
                return (
                  <li
                    key={item.path}
                    className="relative"
                    onMouseEnter={e => isOpen && handleJobMouseEnter(e)}
                    onMouseLeave={handleJobMouseLeave}
                  >
                    {renderItem(item.label)}

                    {isOpen && showJobSubMenu && createPortal(
                      <div
                        ref={jobDropdownRef}
                        style={{ top: jobDropdownPos.top, left: jobDropdownPos.left }}
                        className="fixed w-48 bg-sidebar shadow-lg border border-sidebar-border z-50"
                        onMouseEnter={() => setShowJobSubMenu(true)}
                        onMouseLeave={handleJobMouseLeave}
                      >
                        <ul>
                          {JobSubMenu.map(sub => (
                            <li key={sub.path}>
                              <NavLink
                                to={sub.path}
                                end={sub.path === "/jobs"} // only for dashboard
                                onClick={() => { setJobSubPage(sub?.label); setJobName("Job-Portal"); }}
                                className={({ isActive }) => cn(
                                  "block px-4 py-2 text-sm text-white hover:bg-sidebar-accent",
                                  isActive && "bg-sidebar-accent font-medium"
                                )}
                              >
                                {sub.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>,
                      document.body
                    )}
                  </li>
                );
              }

              if (item.label === "Lead-Portal") {
                return (
                  <li
                    key={item.path}
                    className="relative"
                    onMouseEnter={e => isOpen && handleLeadMouseEnter(e)}
                    onMouseLeave={handleLeadMouseLeave}
                  >
                    {renderItem(item.label)}

                    {isOpen && showLeadSubMenu && createPortal(
                      <div
                        ref={leadDropdownRef}
                        style={{ top: leadDropdownPos.top, left: leadDropdownPos.left }}
                        className="fixed w-48 bg-sidebar shadow-lg border border-sidebar-border z-50"
                        onMouseEnter={() => setShowLeadSubMenu(true)}
                        onMouseLeave={handleLeadMouseLeave}
                      >
                        <ul>
                          {LeadSubMenu.map(sub => (
                            <li key={sub.path}>
                              <NavLink
                                to={sub.path}
                                end={sub.path === "/leads"} // only for dashboard
                                onClick={() => { setLeadSubPage(sub?.label); setLeadName("Lead-Portal"); }}
                                className={({ isActive }) => cn(
                                  "block px-4 py-2 text-sm text-white hover:bg-sidebar-accent",
                                  isActive && "bg-sidebar-accent font-medium"
                                )}
                              >
                                {sub.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>,
                      document.body
                    )}
                  </li>
                );
              }


              return <li key={item.path}>{renderItem(item.label)}</li>;
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <button
            onClick={logout}
            className={cn(
              "sidebar-item w-full flex items-center gap-3 text-destructive hover:bg-destructive/10",
              !isOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;





























// {/* Navigation */}
// <nav className="flex-1 overflow-y-auto py-4 relative">
//   <ul className="space-y-1 px-2">
//     {filteredNavItems.map(item => {
//       // Check if parent items with submenus are active
//       const isTasksActive = location.pathname.startsWith("/tasks");
//       const isJobPortalActive = location.pathname.startsWith("/jobs");

//       // Check if this menu item (leaf) itself is active
//       const isThisActive = location.pathname === item.path;

//       const renderItem = (itemLabel: string) => (
//         <NavLink
//           to={item.path}
//           onClick={() => { setTaskName(""); setJobName(""); setActiveSidebar(item.label) }}
//           className={cn(
//             "sidebar-item flex items-center justify-between p-2",
//             // Active logic: subpage active OR exact page active
//             (itemLabel === "Tasks" && isTasksActive) ||
//             (itemLabel === "Job-Portal" && isJobPortalActive) ||
//             isThisActive
//               ? "bg-blue-600 text-white font-semibold"
//               : "hover:bg-blue-500 text-white",
//             !isOpen && "justify-center"
//           )}
//         >
//           <div className="flex items-center gap-3">
//             <item.icon className="w-5 h-5 flex-shrink-0" />
//             {isOpen && <span>{item.label === "Employees" ? user?.role === "super_admin" ? "Admins" : "Employees" : item?.label}</span>}
//           </div>

//           {/* Arrow only for Tasks & Job-Portal */}
//           {isOpen && (item.label === "Tasks" || item.label === "Job-Portal") && (
//             <ChevronRight
//               className={cn(
//                 "w-4 h-4 transition-transform duration-200",
//                 item.label === "Tasks" && showTaskSubMenu && "rotate-90",
//                 item.label === "Job-Portal" && showJobSubMenu && "rotate-90"
//               )}
//             />
//           )}
//         </NavLink>
//       );

//       // Tasks Dropdown
//       if (item.label === "Tasks") {
//         return (
//           <li
//             key={item.path}
//             onMouseEnter={() => isOpen && setShowTaskSubMenu(true)}
//             onMouseLeave={() => setShowTaskSubMenu(false)}
//           >
//             {renderItem(item.label)}

//             {showTaskSubMenu && createPortal(
//               <div
//                 style={{ top: dropdownPos.top, left: dropdownPos.left }}
//                 className="fixed w-48 bg-sidebar shadow-lg border border-sidebar-border z-50 md:ml-56 md:mt-52"
//                 onMouseEnter={() => setShowTaskSubMenu(true)}
//                 onMouseLeave={handleTaskMouseLeave}
//               >
//                 <ul>
//                   {filteredTaskSubMenu.map(sub => (
//                     <li key={sub.path}>
//                       <NavLink
//                         to={sub.path}
//                         onClick={() => { setTaskName("Tasks"); setTaskSubPage(sub?.label); }}
//                         end
//                         className={({ isActive }) => cn(
//                           "block px-4 py-2 text-sm text-white hover:bg-blue-500",
//                           isActive ? "bg-blue-600 font-medium" : ""
//                         )}
//                       >
//                         {sub.label}
//                       </NavLink>
//                     </li>
//                   ))}
//                 </ul>
//               </div>,
//               document.body
//             )}
//           </li>
//         );
//       }

//       // Job Dropdown
//       if (item.label === "Job-Portal") {
//         return (
//           <li
//             key={item.path}
//             className="relative"
//             onMouseEnter={e => isOpen && handleJobMouseEnter(e)}
//             onMouseLeave={handleJobMouseLeave}
//           >
//             {renderItem(item.label)}

//             {isOpen && showJobSubMenu && createPortal(
//               <div
//                 ref={jobDropdownRef}
//                 style={{ top: jobDropdownPos.top, left: jobDropdownPos.left }}
//                 className="fixed w-48 bg-sidebar shadow-lg border border-sidebar-border z-50"
//                 onMouseEnter={() => setShowJobSubMenu(true)}
//                 onMouseLeave={handleJobMouseLeave}
//               >
//                 <ul>
//                   {JobSubMenu.map(sub => (
//                     <li key={sub.path}>
//                       <NavLink
//                         to={sub.path}
//                         end
//                         onClick={() => { setJobSubPage(sub?.label); setJobName("Job-Portal"); }}
//                         className={({ isActive }) => cn(
//                           "block px-4 py-2 text-sm text-white hover:bg-blue-500",
//                           isActive ? "bg-blue-600 font-medium" : ""
//                         )}
//                       >
//                         {sub.label}
//                       </NavLink>
//                     </li>
//                   ))}
//                 </ul>
//               </div>,
//               document.body
//             )}
//           </li>
//         );
//       }

//       // Leaf item (no subpages)
//       return <li key={item.path}>{renderItem(item.label)}</li>;
//     })}
//   </ul>
// </nav>
