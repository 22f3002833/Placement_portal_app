window.router = {
    navigate(view, params = {}) {
        if (!window.app) return;

        const app = window.app;
        app.currentView = view;
        app.currentParams = params;
        app.message = "";
        app.error = "";
    },

    setAuthView(app, view) {
        app.currentView = view;
        app.currentParams = {};
        app.message = "";
        app.error = "";

        if (view === "login" && typeof app.resetRegisterForm === "function") {
            app.resetRegisterForm();
        }

        if (view === "register" && typeof app.resetLoginForm === "function") {
            app.resetLoginForm();
        }
    },

    async goToDashboard(app, role = "") {
        const finalRole = role || app.userRole;

        app.currentParams = {};
        app.message = "";
        app.error = "";

        if (finalRole === "admin") {
            app.userRole = "admin";
            app.currentView = "admin-dashboard";
            app.adminSection = "overview";

            if (typeof app.loadAdminDashboard === "function") {
                await app.loadAdminDashboard();
            } else {
                await this.loadDashboardByRole(app, finalRole);
            }
            return;
        }

        if (finalRole === "company") {
            app.userRole = "company";
            app.currentView = "company-dashboard";
            app.companySection = "overview";

            if (typeof app.loadCompanyDashboard === "function") {
                await app.loadCompanyDashboard();
            } else {
                await this.loadDashboardByRole(app, finalRole);
            }
            return;
        }

        if (finalRole === "student") {
            app.userRole = "student";
            app.currentView = "student-dashboard";
            app.studentSection = "overview";

            if (typeof app.loadStudentDashboard === "function") {
                await app.loadStudentDashboard();
            } else {
                await this.loadDashboardByRole(app, finalRole);
            }
            return;
        }

        this.logout(app, "Invalid role. Please log in again.");
    },

    async loadDashboardByRole(app, role) {
        if (role === "admin") {
            if (typeof app.fetchAdminStats === "function") {
                await app.fetchAdminStats();
            }
            if (!app.userRole) return;

            if (typeof app.fetchPendingCompanies === "function") {
                await app.fetchPendingCompanies();
            }
            if (!app.userRole) return;

            if (typeof app.fetchAdminCompanies === "function") {
                await app.fetchAdminCompanies();
            }
            if (!app.userRole) return;

            if (typeof app.fetchAdminStudents === "function") {
                await app.fetchAdminStudents();
            }
            if (!app.userRole) return;

            if (typeof app.fetchAdminJobs === "function") {
                await app.fetchAdminJobs();
            }
            if (!app.userRole) return;

            if (typeof app.fetchAdminApplications === "function") {
                await app.fetchAdminApplications();
            }
        } else if (role === "company") {
            if (typeof app.loadCompanyDashboard === "function") {
                await app.loadCompanyDashboard();
            }
        } else if (role === "student") {
            if (typeof app.loadStudentDashboard === "function") {
                await app.loadStudentDashboard();
            }
        }
    },

    requireAuth(app, allowedRoles = []) {
        const token = window.api.getToken();

        if (!token) {
            window.api.clearToken();
            this.logout(app, "Session expired. Please log in again.");
            return false;
        }

        if (window.api.isTokenExpired(token)) {
            window.api.clearToken();
            this.logout(app, "Session expired. Please log in again.");
            return false;
        }

        const role = window.api.parseJwtRole(token);
        if (!role) {
            window.api.clearToken();
            this.logout(app, "Invalid session. Please log in again.");
            return false;
        }

        app.userRole = role;

        if (allowedRoles.length && !allowedRoles.includes(role)) {
            app.error = "You are not authorized to access this page.";
            this.backToDashboard(app);
            return false;
        }

        return true;
    },

    async openAdminSection(app, section) {
        if (!this.requireAuth(app, ["admin"])) return;

        app.adminSection = section;
        app.currentView = "admin-dashboard";
        app.currentParams = {};
        app.message = "";
        app.error = "";

        if (section === "overview" && typeof app.fetchAdminStats === "function") {
            await app.fetchAdminStats();
        } else if (section === "pending-companies" && typeof app.fetchPendingCompanies === "function") {
            await app.fetchPendingCompanies();
        } else if (section === "companies" && typeof app.fetchAdminCompanies === "function") {
            await app.fetchAdminCompanies();
        } else if (section === "students" && typeof app.fetchAdminStudents === "function") {
            await app.fetchAdminStudents();
        } else if (section === "jobs" && typeof app.fetchAdminJobs === "function") {
            await app.fetchAdminJobs();
        } else if (section === "applications" && typeof app.fetchAdminApplications === "function") {
            await app.fetchAdminApplications();
        }
    },

    async openCompanySection(app, section, params = {}) {
        if (!this.requireAuth(app, ["company"])) return;

        app.companySection = section;
        app.currentView = "company-dashboard";
        app.currentParams = params;
        app.message = "";
        app.error = "";

        if (section === "overview") {
            if (typeof app.loadCompanyDashboard === "function") {
                await app.loadCompanyDashboard();
            }
        } else if (section === "jobs") {
            if (typeof app.fetchCompanyJobs === "function") {
                await app.fetchCompanyJobs();
            }
        } else if (section === "applications" && params.jobId) {
            if (typeof app.fetchJobApplications === "function") {
                await app.fetchJobApplications(params.jobId);
            }
        } else if (section === "placements") {
            if (typeof app.fetchCompanyPlacements === "function") {
                await app.fetchCompanyPlacements();
            }
        }
    },

    async openStudentSection(app, section, params = {}) {
        if (!this.requireAuth(app, ["student"])) return;

        app.studentSection = section;
        app.currentView = "student-dashboard";
        app.currentParams = params;
        app.message = "";
        app.error = "";

        if (section === "overview") {
            if (typeof app.loadStudentDashboard === "function") {
                await app.loadStudentDashboard();
            }
        } else if (section === "profile") {
            if (typeof app.fetchStudentProfile === "function") {
                await app.fetchStudentProfile();
            }
        } else if (section === "jobs") {
            if (typeof app.fetchStudentJobs === "function") {
                await app.fetchStudentJobs();
            }
        } else if (section === "applications") {
            if (typeof app.fetchStudentApplications === "function") {
                await app.fetchStudentApplications();
            }
        } else if (section === "placements") {
            if (typeof app.fetchStudentPlacements === "function") {
                await app.fetchStudentPlacements();
            }
        }
    },

    backToDashboard(app) {
        return this.goToDashboard(app, app.userRole);
    },

    logout(app, message = "Logged out successfully") {
        window.api.clearToken();

        if (typeof app.clearAppState === "function") {
            app.clearAppState();
        } else {
            app.userRole = "";
            app.currentParams = {};

            if (typeof app.resetAdminState === "function") {
                app.resetAdminState();
            }
            if (typeof app.resetCompanyState === "function") {
                app.resetCompanyState();
            }
            if (typeof app.resetStudentState === "function") {
                app.resetStudentState();
            }
            if (typeof app.resetLoginForm === "function") {
                app.resetLoginForm();
            }
            if (typeof app.resetRegisterForm === "function") {
                app.resetRegisterForm();
            }
        }

        app.currentView = "login";
        app.message = message;
        app.error = "";
    }
};