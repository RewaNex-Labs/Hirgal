
/* =====================================
   HIRGAL - STORAGE MANAGEMENT
===================================== */

const HirgalStorage = {
    get(key, fallback = []) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error("Storage read error:", error);
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage save error:", error);
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    getUsers() {
        return this.get("hirgal_users", []);
    },

    saveUsers(users) {
        return this.set("hirgal_users", users);
    },

    getCurrentUser() {
        return this.get("hirgal_current_user", null);
    },

    setCurrentUser(user) {
        return this.set("hirgal_current_user", user);
    },

    logout() {
        this.remove("hirgal_current_user");
    },

    userKey(type) {
        const user = this.getCurrentUser();
        if (!user) return null;

        return `hirgal_${type}_${user.id}`;
    },

    getUserData(type, fallback = []) {
        const key = this.userKey(type);
        return key ? this.get(key, fallback) : fallback;
    },

    saveUserData(type, value) {
        const key = this.userKey(type);
        return key ? this.set(key, value) : false;
    }
};
