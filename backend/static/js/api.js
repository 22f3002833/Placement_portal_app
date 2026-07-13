window.api = {
    _token: null,
    _storageKey: "placement_portal_token",

    getToken() {
        if (this._token) {
            return this._token;
        }

        try {
            const storedToken = window.localStorage.getItem(this._storageKey);
            this._token = storedToken || null;
            return this._token;
        } catch (_) {
            return this._token;
        }
    },

    setToken(token) {
        this._token = token || null;

        try {
            if (this._token) {
                window.localStorage.setItem(this._storageKey, this._token);
            } else {
                window.localStorage.removeItem(this._storageKey);
            }
        } catch (_) {}
    },

    clearToken() {
        this._token = null;

        try {
            window.localStorage.removeItem(this._storageKey);
        } catch (_) {}
    },

    getAuthHeaders(isJson = false) {
        const headers = {};
        const token = this.getToken();

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        if (isJson) {
            headers["Content-Type"] = "application/json";
            headers["Accept"] = "application/json";
        }

        return headers;
    },

    async request(url, options = {}) {
        let response;

        try {
            response = await fetch(url, options);
        } catch (error) {
            return {
                ok: false,
                status: 0,
                response: null,
                data: { message: "Network error. Please check your connection." }
            };
        }

        const contentType = response.headers.get("content-type") || "";
        let data = null;

        if (response.status === 204) {
            data = null;
        } else if (contentType.includes("application/json")) {
            try {
                data = await response.json();
            } catch (error) {
                data = { message: "Failed to parse JSON response" };
            }
        } else {
            try {
                const text = await response.text();
                data = text || null;
            } catch (error) {
                data = null;
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            response,
            data
        };
    },

    decodeJwt(token) {
        try {
            if (!token || typeof token !== "string") {
                return null;
            }

            const parts = token.split(".");
            if (parts.length < 2) {
                return null;
            }

            let payload = parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            while (payload.length % 4) {
                payload += "=";
            }

            return JSON.parse(atob(payload));
        } catch (error) {
            return null;
        }
    },

    parseJwtRole(token) {
        const payload = this.decodeJwt(token);
        return payload?.role || "";
    },

    isTokenExpired(token) {
        const payload = this.decodeJwt(token);
        if (!payload || !payload.exp) {
            return true;
        }

        return (Date.now() / 1000) >= payload.exp;
    },

    isLoggedIn() {
        const token = this.getToken();
        return !!token && !this.isTokenExpired(token);
    },

    handleUnauthorized(status) {
        if (status === 401) {
            this.clearToken();

            if (window.router && typeof window.router.navigate === "function") {
                window.router.navigate("login");
            }

            return true;
        }

        return false;
    },

    badgeClass(status) {
        const map = {
            Applied: "bg-primary",
            Shortlisted: "bg-warning text-dark",
            Interview: "bg-info text-dark",
            Offer: "bg-success",
            Rejected: "bg-danger",
            Placed: "bg-dark",
            Active: "bg-success",
            Closed: "bg-secondary",
            Approved: "bg-success",
            RejectedJob: "bg-danger",
            Pending: "bg-warning text-dark"
        };

        return map[status] || "bg-secondary";
    },

    formatCurrency(value) {
        if (value === null || value === undefined || value === "") {
            return "N/A";
        }

        const number = Number(value);
        if (Number.isNaN(number)) {
            return `₹ ${value}`;
        }

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(number);
    },

    formatDate(value) {
        if (!value) {
            return "N/A";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    },

    formatDateTime(value) {
        if (!value) {
            return "N/A";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }
};