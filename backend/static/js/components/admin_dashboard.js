window.AdminDashboardComponent = {
    props: {
        adminStats: {
            type: Object,
            default: null
        },
        pendingCompanies: {
            type: Array,
            default: () => []
        },
        adminCompanies: {
            type: Array,
            default: () => []
        },
        adminStudents: {
            type: Array,
            default: () => []
        },
        adminJobs: {
            type: Array,
            default: () => []
        },
        adminApplications: {
            type: Array,
            default: () => []
        },
        adminSection: {
            type: String,
            default: "overview"
        }
    },

    emits: [
        "approve-company",
        "export-companies",
        "export-students",
        "export-jobs",
        "export-applications",
        "logout"
    ],

    data() {
        return {
            pendingCompaniesSearch: "",
            companiesSearch: "",
            studentsSearch: "",
            jobsSearch: "",
            applicationsSearch: ""
        };
    },

    computed: {
        filteredPendingCompanies() {
            const query = this.normalizeSearch(this.pendingCompaniesSearch);
            if (!query) return this.pendingCompanies;

            return this.pendingCompanies.filter(company => {
                const haystack = [
                    company.name,
                    company.industry,
                    company.location,
                    company.email
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredAdminCompanies() {
            const query = this.normalizeSearch(this.companiesSearch);
            if (!query) return this.adminCompanies;

            return this.adminCompanies.filter(company => {
                const haystack = [
                    company.id,
                    company.name,
                    company.industry,
                    company.location,
                    company.email,
                    company.is_approved ? "yes approved true" : "no pending false"
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredAdminStudents() {
            const query = this.normalizeSearch(this.studentsSearch);
            if (!query) return this.adminStudents;

            return this.adminStudents.filter(student => {
                const haystack = [
                    student.id,
                    student.name,
                    student.email,
                    student.department,
                    student.course,
                    student.cgpa
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredAdminJobs() {
            const query = this.normalizeSearch(this.jobsSearch);
            if (!query) return this.adminJobs;

            return this.adminJobs.filter(job => {
                const haystack = [
                    job.id,
                    job.company_name,
                    job.title,
                    job.location,
                    job.status
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredAdminApplications() {
            const query = this.normalizeSearch(this.applicationsSearch);
            if (!query) return this.adminApplications;

            return this.adminApplications.filter(application => {
                const haystack = [
                    application.id,
                    application.student_name,
                    application.job_title,
                    application.company_name,
                    application.status
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        }
    },

    methods: {
        normalizeSearch(value) {
            return String(value || "").trim().toLowerCase();
        },

        openSection(section) {
            if (window.router && window.app) {
                window.router.openAdminSection(window.app, section);
            }
        },

        approveCompany(companyId) {
            this.$emit("approve-company", companyId);
        },

        logout() {
            this.$emit("logout");
        },

        formatValue(value) {
            return value === null || value === undefined || value === "" ? "-" : value;
        }
    },

    template: `
        <div>
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="mb-0">Admin Dashboard</h3>
                <button type="button" class="btn btn-outline-danger" @click="logout">
                    Logout
                </button>
            </div>

            <div class="mb-4">
                <div class="d-flex flex-wrap gap-2">
                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'overview' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('overview')"
                    >
                        Overview
                    </button>

                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'pending-companies' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('pending-companies')"
                    >
                        Pending Companies
                    </button>

                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'companies' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('companies')"
                    >
                        Companies
                    </button>

                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'students' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('students')"
                    >
                        Students
                    </button>

                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'jobs' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('jobs')"
                    >
                        Jobs
                    </button>

                    <button
                        type="button"
                        class="btn"
                        :class="adminSection === 'applications' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="openSection('applications')"
                    >
                        Applications
                    </button>
                </div>
            </div>

            <div v-if="adminSection === 'overview'">
                <div class="row g-3" v-if="adminStats">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Total Students</h6>
                                <h4 class="mb-0">{{ adminStats.total_students || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Total Companies</h6>
                                <h4 class="mb-0">{{ adminStats.total_companies || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Total Jobs</h6>
                                <h4 class="mb-0">{{ adminStats.total_jobs || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Applications</h6>
                                <h4 class="mb-0">{{ adminStats.total_applications || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Placements</h6>
                                <h4 class="mb-0">{{ adminStats.total_placements || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Pending Companies</h6>
                                <h4 class="mb-0">{{ adminStats.pending_companies || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Active Jobs</h6>
                                <h4 class="mb-0">{{ adminStats.active_jobs || 0 }}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="text-muted mb-2">Closed Jobs</h6>
                                <h4 class="mb-0">{{ adminStats.closed_jobs || 0 }}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="alert alert-info mb-0">
                    Loading dashboard statistics...
                </div>
            </div>

            <div v-else-if="adminSection === 'pending-companies'">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <h5 class="mb-0">Pending Company Approvals</h5>
                            <input
                                v-model="pendingCompaniesSearch"
                                type="text"
                                class="form-control"
                                style="max-width: 320px;"
                                placeholder="Search name, industry, location, email..."
                            >
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Industry</th>
                                        <th>Location</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="company in filteredPendingCompanies" :key="company.id">
                                        <td>{{ formatValue(company.name) }}</td>
                                        <td>{{ formatValue(company.industry) }}</td>
                                        <td>{{ formatValue(company.location) }}</td>
                                        <td>{{ formatValue(company.email) }}</td>
                                        <td>
                                            <button
                                                type="button"
                                                class="btn btn-success btn-sm"
                                                @click="approveCompany(company.id)"
                                            >
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredPendingCompanies.length === 0">
                                        <td colspan="5" class="text-center text-muted">No matching pending companies found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="adminSection === 'companies'">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <h5 class="mb-0">Companies</h5>
                            <div class="d-flex flex-column flex-md-row gap-2 w-100 justify-content-md-end">
                                <input
                                    v-model="companiesSearch"
                                    type="text"
                                    class="form-control"
                                    style="max-width: 320px;"
                                    placeholder="Search ID, name, industry, email..."
                                >
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    @click="$emit('export-companies')"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Industry</th>
                                        <th>Location</th>
                                        <th>Email</th>
                                        <th>Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="company in filteredAdminCompanies" :key="company.id">
                                        <td>{{ formatValue(company.id) }}</td>
                                        <td>{{ formatValue(company.name) }}</td>
                                        <td>{{ formatValue(company.industry) }}</td>
                                        <td>{{ formatValue(company.location) }}</td>
                                        <td>{{ formatValue(company.email) }}</td>
                                        <td>{{ company.is_approved ? 'Yes' : 'No' }}</td>
                                    </tr>
                                    <tr v-if="filteredAdminCompanies.length === 0">
                                        <td colspan="6" class="text-center text-muted">No matching companies found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="adminSection === 'students'">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <h5 class="mb-0">Students</h5>
                            <div class="d-flex flex-column flex-md-row gap-2 w-100 justify-content-md-end">
                                <input
                                    v-model="studentsSearch"
                                    type="text"
                                    class="form-control"
                                    style="max-width: 320px;"
                                    placeholder="Search ID, name, email, department..."
                                >
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    @click="$emit('export-students')"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Department</th>
                                        <th>Course</th>
                                        <th>CGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="student in filteredAdminStudents" :key="student.id">
                                        <td>{{ formatValue(student.id) }}</td>
                                        <td>{{ formatValue(student.name) }}</td>
                                        <td>{{ formatValue(student.email) }}</td>
                                        <td>{{ formatValue(student.department) }}</td>
                                        <td>{{ formatValue(student.course) }}</td>
                                        <td>{{ formatValue(student.cgpa) }}</td>
                                    </tr>
                                    <tr v-if="filteredAdminStudents.length === 0">
                                        <td colspan="6" class="text-center text-muted">No matching students found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="adminSection === 'jobs'">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <h5 class="mb-0">Jobs</h5>
                            <div class="d-flex flex-column flex-md-row gap-2 w-100 justify-content-md-end">
                                <input
                                    v-model="jobsSearch"
                                    type="text"
                                    class="form-control"
                                    style="max-width: 320px;"
                                    placeholder="Search ID, company, title, location..."
                                >
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    @click="$emit('export-jobs')"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Company</th>
                                        <th>Title</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="job in filteredAdminJobs" :key="job.id">
                                        <td>{{ formatValue(job.id) }}</td>
                                        <td>{{ formatValue(job.company_name) }}</td>
                                        <td>{{ formatValue(job.title) }}</td>
                                        <td>{{ formatValue(job.location) }}</td>
                                        <td>{{ formatValue(job.status) }}</td>
                                    </tr>
                                    <tr v-if="filteredAdminJobs.length === 0">
                                        <td colspan="5" class="text-center text-muted">No matching jobs found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="adminSection === 'applications'">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <h5 class="mb-0">Applications</h5>
                            <div class="d-flex flex-column flex-md-row gap-2 w-100 justify-content-md-end">
                                <input
                                    v-model="applicationsSearch"
                                    type="text"
                                    class="form-control"
                                    style="max-width: 320px;"
                                    placeholder="Search ID, student, job, company, status..."
                                >
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    @click="$emit('export-applications')"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Student</th>
                                        <th>Job</th>
                                        <th>Company</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="application in filteredAdminApplications" :key="application.id">
                                        <td>{{ formatValue(application.id) }}</td>
                                        <td>{{ formatValue(application.student_name) }}</td>
                                        <td>{{ formatValue(application.job_title) }}</td>
                                        <td>{{ formatValue(application.company_name) }}</td>
                                        <td>{{ formatValue(application.status) }}</td>
                                    </tr>
                                    <tr v-if="filteredAdminApplications.length === 0">
                                        <td colspan="5" class="text-center text-muted">No matching applications found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};