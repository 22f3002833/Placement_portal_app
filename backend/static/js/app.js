const { createApp } = Vue;

const createDefaultLoginForm = () => ({
    username: "",
    password: ""
});

const createDefaultRegisterForm = () => ({
    role: "student",
    username: "",
    email: "",
    password: "",
    name: "",
    department: "",
    industry: ""
});

const createDefaultCompanyJobForm = () => ({
    title: "",
    description: "",
    salary: "",
    status: "Active"
});

const createDefaultPlacementForm = () => ({
    appId: null,
    position: "",
    salary: ""
});

const createDefaultInterviewForm = () => ({
    appId: null,
    interview_datetime: "",
    interview_mode: "",
    interview_location: "",
    interview_notes: ""
});

const RootApp = {
    data() {
        return {
            currentView: "login",
            currentParams: {},

            message: "",
            error: "",
            userRole: "",

            adminSection: "overview",
            companySection: "overview",
            studentSection: "overview",

            adminStats: null,
            pendingCompanies: [],
            adminCompanies: [],
            adminStudents: [],
            adminJobs: [],
            adminApplications: [],

            companyJobs: [],
            selectedJobId: null,
            jobApplications: [],
            companyPlacements: [],
            companyJobForm: createDefaultCompanyJobForm(),
            placementForm: createDefaultPlacementForm(),
            interviewForm: createDefaultInterviewForm(),

            studentProfile: null,
            studentJobs: [],
            studentApplications: [],
            studentPlacements: [],
            resumeFile: null,

            loginForm: createDefaultLoginForm(),
            registerForm: createDefaultRegisterForm()
        };
    },

    methods: {
        resetLoginForm() {
            this.loginForm = createDefaultLoginForm();
        },

        resetRegisterForm() {
            this.registerForm = createDefaultRegisterForm();
        },

        resetCompanyState() {
            this.companySection = "overview";
            this.companyJobs = [];
            this.selectedJobId = null;
            this.jobApplications = [];
            this.companyPlacements = [];
            this.companyJobForm = createDefaultCompanyJobForm();
            this.placementForm = createDefaultPlacementForm();
            this.interviewForm = createDefaultInterviewForm();
        },

        resetStudentState() {
            this.studentSection = "overview";
            this.studentProfile = null;
            this.studentJobs = [];
            this.studentApplications = [];
            this.studentPlacements = [];
            this.resumeFile = null;
        },

        resetAdminState() {
            this.adminSection = "overview";
            this.adminStats = null;
            this.pendingCompanies = [];
            this.adminCompanies = [];
            this.adminStudents = [];
            this.adminJobs = [];
            this.adminApplications = [];
        },

        clearMessages() {
            this.message = "";
            this.error = "";
        },

        clearAppState() {
            this.userRole = "";
            this.currentParams = {};
            this.clearMessages();
            this.resetAdminState();
            this.resetCompanyState();
            this.resetStudentState();
            this.resetLoginForm();
            this.resetRegisterForm();
        },

        handleUnauthorized(defaultMessage = "Session expired. Please log in again.") {
            window.api.clearToken();
            this.clearAppState();
            this.currentView = "login";
            this.error = defaultMessage;
        },

        hasUploadedResume() {
            return !!(
                this.studentProfile &&
                (
                    this.studentProfile.resume_uploaded ||
                    this.studentProfile.resumeuploaded
                )
            );
        },

        exportToCsv(filename, rows) {
            if (!Array.isArray(rows) || rows.length === 0) {
                this.error = "No data to export";
                return;
            }

            const headers = Object.keys(rows[0]);

            const escapeCsvValue = (value) => {
                const safeValue = value === null || value === undefined ? "" : String(value);
                return `"${safeValue.replace(/"/g, '""')}"`;
            };

            const csvLines = [
                headers.map(escapeCsvValue).join(","),
                ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(","))
            ];

            const csvContent = csvLines.join("\r\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 10000);

            this.message = `${filename} downloaded successfully`;
            this.error = "";
        },

        exportAdminCompaniesCsv() {
            this.exportToCsv("admin_companies.csv", this.adminCompanies);
        },

        exportAdminStudentsCsv() {
            this.exportToCsv("admin_students.csv", this.adminStudents);
        },

        exportAdminJobsCsv() {
            this.exportToCsv("admin_jobs.csv", this.adminJobs);
        },

        exportAdminApplicationsCsv() {
            this.exportToCsv("admin_applications.csv", this.adminApplications);
        },

        async guardedRequest(url, options = {}) {
            const result = await window.api.request(url, options);
            const response = result.response;
            const data = result.data;

            if (!response) {
                this.error = (data && data.message) || "Network error. Please try again.";
                return { response: null, data, unauthorized: false, failed: true };
            }

            if (response.status === 401) {
                this.handleUnauthorized((data && data.message) || "Session expired. Please log in again.");
                return { response, data, unauthorized: true, failed: true };
            }

            return { response, data, unauthorized: false, failed: false };
        },

        async fetchBlobWithAuth(url, fallbackName = "file") {
            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: window.api.getAuthHeaders()
                });

                if (response.status === 401) {
                    let errorMessage = "Session expired. Please log in again.";
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (_) {}
                    this.handleUnauthorized(errorMessage);
                    return null;
                }

                if (!response.ok) {
                    let errorMessage = "Failed to load file";
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (_) {}
                    this.error = errorMessage;
                    return null;
                }

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const newWindow = window.open(blobUrl, "_blank");

                if (!newWindow) {
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.target = "_blank";
                    a.download = fallbackName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }

                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                }, 10000);

                return true;
            } catch (err) {
                this.error = "Server error while opening file";
                return null;
            }
        },

        switchView(view) {
            if (window.router && typeof window.router.setAuthView === "function") {
                window.router.setAuthView(this, view);
            } else {
                this.currentView = view;
            }
        },

        async goToDashboard(role = "") {
            if (window.router && typeof window.router.goToDashboard === "function") {
                await window.router.goToDashboard(this, role);
                return;
            }

            if (role === "admin") {
                this.currentView = "admin-dashboard";
                await this.loadAdminDashboard();
            } else if (role === "company") {
                this.currentView = "company-dashboard";
                await this.loadCompanyDashboard();
            } else if (role === "student") {
                this.currentView = "student-dashboard";
                await this.loadStudentDashboard();
            }
        },

        logout() {
            if (window.router && typeof window.router.logout === "function") {
                window.router.logout(this);
                return;
            }

            window.api.clearToken();
            this.clearAppState();
            this.currentView = "login";
            this.message = "Logged out successfully";
        },

        async loadAdminDashboard() {
            await this.fetchAdminStats();
            if (!this.userRole) return;

            await this.fetchPendingCompanies();
            if (!this.userRole) return;

            await this.fetchAdminCompanies();
            if (!this.userRole) return;

            await this.fetchAdminStudents();
            if (!this.userRole) return;

            await this.fetchAdminJobs();
            if (!this.userRole) return;

            await this.fetchAdminApplications();
        },

        async fetchAdminStats() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/stats", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load admin stats";
                return;
            }

            this.adminStats = data || null;
        },

        async fetchPendingCompanies() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/companies/pending", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load pending companies";
                return;
            }

            this.pendingCompanies = Array.isArray(data) ? data : [];
        },

        async fetchAdminCompanies() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/companies", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load companies";
                return;
            }

            this.adminCompanies = Array.isArray(data) ? data : [];
        },

        async fetchAdminStudents() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/students", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load students";
                return;
            }

            this.adminStudents = Array.isArray(data) ? data : [];
        },

        async fetchAdminJobs() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/jobs", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load jobs";
                return;
            }

            this.adminJobs = Array.isArray(data) ? data : [];
        },

        async fetchAdminApplications() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/admin/applications", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load applications";
                return;
            }

            this.adminApplications = Array.isArray(data) ? data : [];
        },

        async approveCompany(companyId) {
            this.clearMessages();

            const { response, data, unauthorized, failed } = await this.guardedRequest(`/api/admin/companies/${companyId}/approve`, {
                method: "PATCH",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to approve company";
                return;
            }

            this.message = (data && data.message) || "Company approved";
            await this.fetchPendingCompanies();
            await this.fetchAdminStats();
            await this.fetchAdminCompanies();
        },

        async loadCompanyDashboard() {
            await this.fetchCompanyJobs();
            if (!this.userRole) return;

            await this.fetchCompanyPlacements();
            if (!this.userRole) return;

            if (this.selectedJobId) {
                await this.fetchJobApplications(this.selectedJobId);
            }
        },

        async fetchCompanyJobs() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/company/jobs", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load company jobs";
                return;
            }

            this.companyJobs = Array.isArray(data) ? data : [];
        },

        async createJob() {
            this.clearMessages();

            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/company/jobs", {
                method: "POST",
                headers: window.api.getAuthHeaders(true),
                body: JSON.stringify(this.companyJobForm)
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to create job";
                return;
            }

            this.message = (data && data.message) || "Job created";
            this.companyJobForm = createDefaultCompanyJobForm();
            await this.fetchCompanyJobs();
        },

        async updateJobStatus(jobId, status) {
            this.clearMessages();

            const { response, data, unauthorized, failed } = await this.guardedRequest(`/api/company/jobs/${jobId}`, {
                method: "PATCH",
                headers: window.api.getAuthHeaders(true),
                body: JSON.stringify({ status })
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to update job status";
                return;
            }

            this.message = (data && data.message) || "Job updated";
            await this.fetchCompanyJobs();
        },

        async fetchJobApplications(jobId) {
            this.selectedJobId = jobId;
            this.jobApplications = [];
            this.clearMessages();

            const { response, data, unauthorized, failed } = await this.guardedRequest(`/api/company/jobs/${jobId}/applications`, {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load job applications";
                return;
            }

            this.jobApplications = Array.isArray(data) ? data : [];
        },

        openInterviewForm(appId) {
            this.interviewForm = {
                appId,
                interview_datetime: "",
                interview_mode: "",
                interview_location: "",
                interview_notes: ""
            };
        },

        cancelInterviewForm() {
            this.interviewForm = createDefaultInterviewForm();
        },

        async handleScheduleInterview(payload) {
            this.clearMessages();

            if (!payload || payload.invalid || !payload.appId || !payload.interview_datetime) {
                this.error = "Interview date and time is required";
                return;
            }

            await this.updateApplicationStatus(payload.appId, "Interview", {
                interview_datetime: payload.interview_datetime,
                interview_mode: payload.interview_mode || "",
                interview_location: payload.interview_location || "",
                interview_notes: payload.interview_notes || ""
            });
        },

        async updateApplicationStatus(appId, status, extraData = {}) {
            this.clearMessages();

            const payload = {
                status,
                ...extraData
            };

            const { response, data, unauthorized, failed } = await this.guardedRequest(`/api/company/applications/${appId}/status`, {
                method: "PATCH",
                headers: window.api.getAuthHeaders(true),
                body: JSON.stringify(payload)
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to update application status";
                return;
            }

            this.message = (data && data.message) || "Application updated";
            this.interviewForm = createDefaultInterviewForm();

            if (this.selectedJobId) {
                await this.fetchJobApplications(this.selectedJobId);
            }

            await this.fetchCompanyPlacements();
        },

        async viewResume(studentId, studentName) {
            this.clearMessages();

            if (!studentId) {
                this.error = "Student ID missing for this application";
                return;
            }

            const opened = await this.fetchBlobWithAuth(
                `/api/company/students/${studentId}/resume`,
                `${studentName || "student"}_resume.pdf`
            );

            if (opened) {
                this.message = "Resume opened successfully";
            }
        },

        openFinalizeForm(appId) {
            this.placementForm = {
                appId,
                position: "",
                salary: ""
            };
        },

        async finalizePlacement() {
            this.clearMessages();

            if (!this.placementForm.appId) {
                this.error = "Application ID missing";
                return;
            }

            const { response, data, unauthorized, failed } = await this.guardedRequest(
                `/api/company/applications/${this.placementForm.appId}/finalize`,
                {
                    method: "POST",
                    headers: window.api.getAuthHeaders(true),
                    body: JSON.stringify({
                        position: this.placementForm.position,
                        salary: this.placementForm.salary
                    })
                }
            );

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to finalize placement";
                return;
            }

            this.message = (data && data.message) || "Placement finalized";
            this.placementForm = createDefaultPlacementForm();

            await this.fetchCompanyPlacements();
            await this.fetchCompanyJobs();

            if (this.selectedJobId) {
                await this.fetchJobApplications(this.selectedJobId);
            }
        },

        async fetchCompanyPlacements() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/company/placements", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load placements";
                return;
            }

            this.companyPlacements = Array.isArray(data) ? data : [];
        },

        async loadStudentDashboard() {
            await this.fetchStudentProfile();
            if (!this.userRole) return;

            await this.fetchStudentJobs();
            if (!this.userRole) return;

            await this.fetchStudentApplications();
            if (!this.userRole) return;

            await this.fetchStudentPlacements();
        },

        async fetchStudentProfile() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/student/profile", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load student profile";
                return;
            }

            this.studentProfile = data || null;
        },

        async fetchStudentJobs() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/student/jobs", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load jobs";
                return;
            }

            this.studentJobs = Array.isArray(data) ? data : [];
        },

        async applyToJob(jobId) {
            this.clearMessages();

            if (!this.hasUploadedResume()) {
                this.error = "Please upload your resume before applying for jobs";
                return;
            }

            const alreadyApplied = this.studentApplications.some(app => {
                const appJobId = String(app.job_id || app.jobId || "");
                return appJobId && appJobId === String(jobId);
            });

            if (alreadyApplied) {
                this.error = "You have already applied for this job";
                return;
            }

            const { response, data, unauthorized, failed } = await this.guardedRequest(`/api/student/apply/${jobId}`, {
                method: "POST",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to apply";
                return;
            }

            this.message = (data && data.message) || "Applied successfully";
            await this.fetchStudentApplications();
            await this.fetchStudentJobs();
            await this.fetchStudentPlacements();
        },

        async fetchStudentApplications() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/student/applications", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load student applications";
                return;
            }

            this.studentApplications = Array.isArray(data) ? data : [];
        },

        async fetchStudentPlacements() {
            const { response, data, unauthorized, failed } = await this.guardedRequest("/api/student/placements", {
                method: "GET",
                headers: window.api.getAuthHeaders()
            });

            if (unauthorized || failed) return;
            if (!response.ok) {
                this.error = (data && data.message) || "Failed to load student placements";
                return;
            }

            this.studentPlacements = Array.isArray(data) ? data : [];
        },

        async downloadOfferLetter(placementId) {
            this.clearMessages();

            if (!placementId) {
                this.error = "Placement ID missing";
                return;
            }

            const opened = await this.fetchBlobWithAuth(
                `/api/student/placements/${placementId}/offer-letter`,
                `offer_letter_${placementId}.pdf`
            );

            if (opened) {
                this.message = "Offer letter downloaded successfully";
            }
        },

        onResumeFileChange(event) {
            this.resumeFile = event && event.target && event.target.files
                ? (event.target.files[0] || null)
                : null;
        },

        async uploadResume() {
            this.clearMessages();

            if (!this.resumeFile) {
                this.error = "Please select a resume file";
                return;
            }

            const formData = new FormData();
            formData.append("resume", this.resumeFile);

            try {
                const token = window.api.getToken();

                const response = await fetch("/api/student/resume/upload", {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData
                });

                let data = null;
                try {
                    data = await response.json();
                } catch (_) {
                    data = null;
                }

                if (response.status === 401) {
                    this.handleUnauthorized((data && data.message) || "Session expired. Please log in again.");
                    return;
                }

                if (!response.ok) {
                    this.error = (data && data.message) || "Failed to upload resume";
                    return;
                }

                this.message = (data && data.message) || "Resume uploaded successfully";
                this.resumeFile = null;

                const fileInput = document.getElementById("resumeFileInput");
                if (fileInput) {
                    fileInput.value = "";
                }

                await this.fetchStudentProfile();
                await this.fetchStudentJobs();
                await this.fetchStudentApplications();
            } catch (err) {
                this.error = "Server error while uploading resume";
            }
        },

        async viewOwnResume() {
            this.clearMessages();

            const opened = await this.fetchBlobWithAuth("/api/student/resume", "my_resume.pdf");

            if (opened) {
                this.message = "Resume opened successfully";
            }
        },

        async submitLogin() {
            this.clearMessages();
            this.resetAdminState();
            this.resetCompanyState();
            this.resetStudentState();

            const { response, data } = await window.api.request("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.loginForm)
            });

            if (!response) {
                this.error = (data && data.message) || "Network error while logging in";
                window.api.clearToken();
                return;
            }

            if (!response.ok) {
                this.error = (data && data.message) || "Login failed";
                window.api.clearToken();
                return;
            }

            const token = data.access_token || data.token;

            if (!token) {
                this.error = "Login succeeded but no token was returned";
                window.api.clearToken();
                return;
            }

            window.api.setToken(token);
            this.userRole = data.role || window.api.parseJwtRole(token);

            if (!this.userRole) {
                window.api.clearToken();
                this.error = "Could not determine user role from login response";
                return;
            }

            this.message = "Login successful";
            this.resetLoginForm();

            await this.goToDashboard(this.userRole);
        },

        async submitRegister() {
            this.clearMessages();

            const role = this.registerForm.role;

            const payload = {
                username: this.registerForm.username,
                email: this.registerForm.email,
                password: this.registerForm.password,
                name: this.registerForm.name
            };

            if (role === "student") {
                payload.department = this.registerForm.department;
            } else if (role === "company") {
                payload.industry = this.registerForm.industry;
            }

            const { response, data } = await window.api.request(`/api/auth/register/${role}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response) {
                this.error = (data && data.message) || "Network error while registering";
                return;
            }

            if (!response.ok) {
                this.error = (data && data.message) || "Registration failed";
                return;
            }

            this.message = (data && data.message) || "Registration successful";
            this.currentView = "login";
            this.resetRegisterForm();
        }
    },

    async mounted() {
        window.app = this;

        const token = window.api.getToken();
        if (!token) return;

        if (window.api.isTokenExpired(token)) {
            window.api.clearToken();
            return;
        }

        const role = window.api.parseJwtRole(token);

        if (!role) {
            window.api.clearToken();
            this.userRole = "";
            return;
        }

        try {
            this.userRole = role;
            this.message = "Session restored";
            this.error = "";
            await this.goToDashboard(role);
        } catch (err) {
            window.api.clearToken();
            this.userRole = "";
            this.message = "";
            this.error = "Session expired or dashboard failed to load. Please log in again.";
        }
    },

    template: `
        <div class="container py-4">
            <div class="card shadow-sm auth-card border-0">
                <div class="card-body p-4">
                    <h2 class="text-center mb-4">
                        <i class="bi bi-mortarboard-fill me-2 text-primary"></i>
                        Placement Portal
                    </h2>

                    <template v-if="!userRole">
                        <login-component
                            v-if="currentView === 'login'"
                            :login-form="loginForm"
                            :message="message"
                            :error="error"
                            :current-view="currentView"
                            @switch-view="switchView"
                            @submit-login="submitLogin"
                        ></login-component>

                        <register-component
                            v-else
                            :register-form="registerForm"
                            :message="message"
                            :error="error"
                            :current-view="currentView"
                            @switch-view="switchView"
                            @submit-register="submitRegister"
                        ></register-component>
                    </template>

                    <template v-else>
                        <div v-if="message" class="alert alert-success">{{ message }}</div>
                        <div v-if="error" class="alert alert-danger">{{ error }}</div>

                        <admin-dashboard
                            v-if="currentView === 'admin-dashboard'"
                            :admin-stats="adminStats"
                            :pending-companies="pendingCompanies"
                            :admin-companies="adminCompanies"
                            :admin-students="adminStudents"
                            :admin-jobs="adminJobs"
                            :admin-applications="adminApplications"
                            :admin-section="adminSection"
                            @approve-company="approveCompany"
                            @export-companies="exportAdminCompaniesCsv"
                            @export-students="exportAdminStudentsCsv"
                            @export-jobs="exportAdminJobsCsv"
                            @export-applications="exportAdminApplicationsCsv"
                            @logout="logout"
                        ></admin-dashboard>

                        <company-dashboard
                            v-else-if="currentView === 'company-dashboard'"
                            :company-jobs="companyJobs"
                            :selected-job-id="selectedJobId"
                            :job-applications="jobApplications"
                            :company-placements="companyPlacements"
                            :company-job-form="companyJobForm"
                            :placement-form="placementForm"
                            :interview-form="interviewForm"
                            :company-section="companySection"
                            @create-job="createJob"
                            @fetch-job-applications="fetchJobApplications"
                            @update-job-status="updateJobStatus"
                            @update-application-status="updateApplicationStatus"
                            @open-interview-form="openInterviewForm"
                            @schedule-interview="handleScheduleInterview"
                            @cancel-interview-form="cancelInterviewForm"
                            @view-resume="viewResume"
                            @open-finalize-form="openFinalizeForm"
                            @finalize-placement="finalizePlacement"
                            @logout="logout"
                        ></company-dashboard>

                        <student-dashboard
                            v-else-if="currentView === 'student-dashboard'"
                            :student-profile="studentProfile"
                            :student-jobs="studentJobs"
                            :student-applications="studentApplications"
                            :student-placements="studentPlacements"
                            :resume-file="resumeFile"
                            @resume-file-change="onResumeFileChange"
                            @upload-resume="uploadResume"
                            @view-own-resume="viewOwnResume"
                            @apply-to-job="applyToJob"
                            @download-offer-letter="downloadOfferLetter"
                            @logout="logout"
                        ></student-dashboard>
                    </template>
                </div>
            </div>
        </div>
    `
};

const app = createApp(RootApp);

if (window.LoginComponent) {
    app.component("login-component", window.LoginComponent);
}

if (window.RegisterComponent) {
    app.component("register-component", window.RegisterComponent);
}

if (window.AdminDashboardComponent) {
    app.component("admin-dashboard", window.AdminDashboardComponent);
}

if (window.CompanyDashboardComponent) {
    app.component("company-dashboard", window.CompanyDashboardComponent);
}

if (window.StudentDashboardComponent) {
    app.component("student-dashboard", window.StudentDashboardComponent);
}

app.mount("#app");