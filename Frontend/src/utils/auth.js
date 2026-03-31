
// 🔹 Register User
export const registerUser = (user) => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Check if user already exists
    const exists = users.find((u) => u.email === user.email);
    if (exists) {
        return { success: false, message: "User already exists" };
    }

    // Save new user
    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));

    return { success: true };
};

// 🔹 Login User
export const loginUser = (email, password) => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
        (u) => u.email === email && u.password === password
    );

    if (!user) {
        return { success: false };
    }

    // Save current session
    localStorage.setItem("currentUser", JSON.stringify(user));

    return { success: true, user };
};

// 🔹 Logout User
export const logoutUser = () => {
    localStorage.removeItem("currentUser");
};

// 🔹 Get Current Logged-in User
export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("currentUser"));

// 🔹 Register User
export const registerUser = (user) => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Check if user already exists
    const exists = users.find((u) => u.email === user.email);
    if (exists) {
        return { success: false, message: "User already exists" };
    }

    // Save new user
    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));

    return { success: true };
};

// 🔹 Login User
export const loginUser = (email, password) => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
        (u) => u.email === email && u.password === password
    );

    if (!user) {
        return { success: false };
    }

    // Save current session
    localStorage.setItem("currentUser", JSON.stringify(user));

    return { success: true, user };
};

// 🔹 Logout User
export const logoutUser = () => {
    localStorage.removeItem("currentUser");
};

// 🔹 Get Current Logged-in User
export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("currentUser"));

};
