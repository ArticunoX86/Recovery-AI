import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate("/login");
        } else {
            setUser(currentUser);
            // Redirect to role-specific page
            if (currentUser.role === "doctor") {
                navigate("/doctor");
            } else {
                navigate("/home");
            }
        }
    }, []);

    return (
        <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
            <h1 className="text-2xl mb-4">
                Welcome {user?.profile?.name || user?.email} 👋
            </h1>

            <button
                onClick={() => {
                    logoutUser();
                    navigate("/login");
                }}
                className="bg-red-500 px-4 py-2 rounded"
            >
                Logout
            </button>
        </div>
    );
}