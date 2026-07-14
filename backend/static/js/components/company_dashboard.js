window.CompanyDashboardComponent = {
    props: {
        companyJobs: {
            type: Array,
            default: () => []
        },
        selectedJobId: {
            type: [Number, String, null],
            default: null
        },
        jobApplications: {
            type: Array,
            default: () => []
        },
        companyPlacements: {
            type: Array,
            default: () => []
        },
        companyJobForm: {
            type: Object,
            default: () => ({
                title: "",
                description: "",
                salary: "",
                status: "Active"
            })
        },
        placementForm: {
            type: Object,
            default: () => ({
                appId: null,
                position: "",
                salary: ""
            })
        },
        interviewForm: {
            type: Object,
            default: () => ({
                appId: null,
                interview_datetime: "",
                interview_mode: "",
                interview_location: "",
                interview_notes: ""
            })
        },
        companySection: {
            type: String,
            default: "overview"
        }
    },

    emits: [
        "logout",
        "create-job",
        "fetch-job-applications",
        "update-job-status",
        "update-application-status",
        "view-resume",
        "open-finalize-form",
        "finalize-placement",
        "open-interview-form",
        "schedule-interview",
        "cancel-interview-form"
    ],

    data() {
        return {
            jobsSearch: "",
            applicationsSearch: "",
            placementsSearch: ""
        };
    },

    computed: {
        normalizedJobsSearch() {
            return String(this.jobsSearch || "").trim().toLowerCase();
        },

        normalizedApplicationsSearch() {
            return String(this.applicationsSearch || "").trim().toLowerCase();
        },

        normalizedPlacementsSearch() {
            return String(this.placementsSearch || "").trim().toLowerCase();
        },

        filteredCompanyJobs() {
            if (!this.normalizedJobsSearch) return this.companyJobs;

            return this.companyJobs.filter(job => {
                const text = [
                    job.title,
                    job.description,
                    job.status,
                    job.salary,
                    job.location
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(this.normalizedJobsSearch);
            });
        },

        filteredJobApplications() {
            if (!this.normalizedApplicationsSearch) return this.jobApplications;

            return this.jobApplications.filter(app => {
                const text = [
                    app.student_name,
                    app.student_id,
                    app.status,
                    app.job_title,
                    app.company_name
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(this.normalizedApplicationsSearch);
            });
        },

        filteredCompanyPlacements() {
            if (!this.normalizedPlacementsSearch) return this.companyPlacements;

            return this.companyPlacements.filter(placement => {
                const text = [
                    placement.student_name,
                    placement.position,
                    placement.salary,
                    placement.company_name
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(this.normalizedPlacementsSearch);
            });
        },

        activeJobsCount() {
            return this.companyJobs.filter(job => String(job.status || "").toLowerCase() === "active").length;
        },

        closedJobsCount() {
            return this.companyJobs.filter(job => String(job.status || "").toLowerCase() === "closed").length;
        },

        totalApplicationsCount() {
            return this.jobApplications.length;
        },

        finalizedPlacementsCount() {
            return this.companyPlacements.length;
        }
    },

    methods: {
        badgeClass(status) {
            return window.api.badgeClass(status);
        },

        formatCurrency(value) {
            return window.api.formatCurrency(value);
        },

        shortText(value, max = 100) {
            if (!value) return "No description provided";
            return value.length > max ? value.slice(0, max) + "..." : value;
        },

        openSection(section, params = {}) {
            if (window.router && window.app) {
                window.router.openCompanySection(window.app, section, params);
            }
        },

        requestInterviewForm(appId) {
            this.$emit("open-interview-form", appId);
        },

        submitInterview(appId) {
            if (!this.interviewForm.interview_datetime) {
                this.$emit("schedule-interview", {
                    appId,
                    invalid: true
                });
                return;
            }

            this.$emit("schedule-interview", {
                appId,
                interview_datetime: this.interviewForm.interview_datetime,
                interview_mode: this.interviewForm.interview_mode,
                interview_location: this.interviewForm.interview_location,
                interview_notes: this.interviewForm.interview_notes
            });
        },

        cancelInterview() {
            this.$emit("cancel-interview-form");
        }
    },

    template: `
        <div class="dashboard-shell mt-4">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                    <div class="soft-badge mb-2">
                        <i class="bi bi-building me-1"></i>
                        Company Account
                    </div>
                    <h3 class="mb-1">Company Dashboard</h3>
                    <p class="text-muted mb-0">
                        Post jobs, review applications, update candidate status, and finalize placements.
                    </p>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <div class="text-muted small">
                        <i class="bi bi-person-circle me-1 text-primary"></i>
                        Logged in as <strong class="text-dark text-capitalize">company</strong>
                    </div>
                    <button
                        type="button"
                        class="btn btn-outline-dark btn-sm"
                        @click="$emit('logout')"
                        aria-label="Logout from company account"
                    >
                        <i class="bi bi-box-arrow-right me-1"></i>Logout
                    </button>
                </div>
            </div>

            <div class="d-flex flex-wrap gap-2 mb-4">
                <button
                    type="button"
                    class="btn"
                    :class="companySection === 'overview' ? 'btn-primary' : 'btn-outline-primary'"
                    @click="openSection('overview')"
                >
                    Overview
                </button>
                <button
                    type="button"
                    class="btn"
                    :class="companySection === 'jobs' ? 'btn-primary' : 'btn-outline-primary'"
                    @click="openSection('jobs')"
                >
                    Jobs
                </button>
                <button
                    v-if="selectedJobId"
                    type="button"
                    class="btn"
                    :class="companySection === 'applications' ? 'btn-primary' : 'btn-outline-primary'"
                    @click="openSection('applications', { jobId: selectedJobId })"
                >
                    Applications
                </button>
                <button
                    type="button"
                    class="btn"
                    :class="companySection === 'placements' ? 'btn-primary' : 'btn-outline-primary'"
                    @click="openSection('placements')"
                >
                    Placements
                </button>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Total Jobs</span>
                            <i class="bi bi-briefcase text-primary"></i>
                        </div>
                        <div class="stat-value">{{ companyJobs.length }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Active Jobs</span>
                            <i class="bi bi-play-circle text-success"></i>
                        </div>
                        <div class="stat-value">{{ activeJobsCount }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Applications Loaded</span>
                            <i class="bi bi-people text-warning"></i>
                        </div>
                        <div class="stat-value">{{ totalApplicationsCount }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Placements Finalized</span>
                            <i class="bi bi-award text-danger"></i>
                        </div>
                        <div class="stat-value">{{ finalizedPlacementsCount }}</div>
                    </div>
                </div>
            </div>

            <div class="section-card mb-4">
                <div class="card-body p-4">
                    <h5 class="section-title mb-3">
                        <i class="bi bi-briefcase-fill me-2"></i>Post New Job
                    </h5>

                    <form @submit.prevent="$emit('create-job')" novalidate>
                        <div class="row g-3">
                            <div class="col-12 col-lg-6">
                                <label class="form-label" for="job-title">Job Title</label>
                                <input
                                    id="job-title"
                                    v-model="companyJobForm.title"
                                    type="text"
                                    class="form-control"
                                    placeholder="e.g. Software Engineer"
                                    required
                                >
                            </div>

                            <div class="col-12 col-lg-6">
                                <label class="form-label" for="job-salary">Salary</label>
                                <input
                                    id="job-salary"
                                    v-model="companyJobForm.salary"
                                    type="text"
                                    class="form-control"
                                    placeholder="Enter numeric salary only"
                                >
                            </div>

                            <div class="col-12">
                                <label class="form-label" for="job-description">Description</label>
                                <textarea
                                    id="job-description"
                                    v-model="companyJobForm.description"
                                    class="form-control"
                                    rows="4"
                                    placeholder="Describe responsibilities, skills, and job expectations"
                                ></textarea>
                            </div>
                        </div>

                        <div class="mt-3">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-plus-circle-fill me-1"></i>Create Job
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="section-card mb-4">
                <div class="card-body p-4">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <div>
                            <h5 class="section-title mb-1">
                                <i class="bi bi-list-task me-2"></i>My Jobs
                            </h5>
                            <p class="text-muted mb-0">
                                Manage job visibility and open the application list for each role.
                            </p>
                        </div>
                        <span class="soft-badge">
                            {{ filteredCompanyJobs.length }} shown · {{ closedJobsCount }} closed
                        </span>
                    </div>

                    <div class="mb-3">
                        <input
                            v-model="jobsSearch"
                            type="text"
                            class="form-control"
                            placeholder="Search jobs by title, description, status, salary, or location"
                        >
                    </div>

                    <div v-if="filteredCompanyJobs.length === 0" class="empty-state">
                        <div class="mb-2">
                            <i class="bi bi-briefcase fs-3 text-primary"></i>
                        </div>
                        <div class="fw-semibold mb-1">No jobs found</div>
                        <div>
                            {{ companyJobs.length === 0 ? 'Create your first job posting to start receiving applications.' : 'Try a different search term.' }}
                        </div>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">Title</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Salary</th>
                                    <th scope="col" class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="job in filteredCompanyJobs" :key="job.id">
                                    <td>
                                        <div class="fw-semibold">{{ job.title }}</div>
                                        <div class="small text-muted">{{ shortText(job.description) }}</div>
                                    </td>
                                    <td>
                                        <span class="badge" :class="badgeClass(job.status)">
                                            {{ job.status || 'Unknown' }}
                                        </span>
                                    </td>
                                    <td>{{ formatCurrency(job.salary) }}</td>
                                    <td class="text-end">
                                        <div class="d-flex flex-wrap justify-content-end gap-2">
                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-primary"
                                                @click="$emit('fetch-job-applications', job.id)"
                                                :aria-label="'View applications for ' + job.title"
                                            >
                                                <i class="bi bi-people-fill me-1"></i>Applications
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-warning"
                                                @click="$emit('update-job-status', job.id, 'Closed')"
                                                :disabled="String(job.status || '').toLowerCase() === 'closed'"
                                            >
                                                Close
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-success"
                                                @click="$emit('update-job-status', job.id, 'Active')"
                                                :disabled="String(job.status || '').toLowerCase() === 'active'"
                                            >
                                                Reopen
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-if="selectedJobId" class="section-card mb-4">
                <div class="card-body p-4">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <h5 class="section-title mb-0">
                            <i class="bi bi-file-earmark-person me-2"></i>Applications for Selected Job
                        </h5>
                        <span class="soft-badge">{{ filteredJobApplications.length }} shown</span>
                    </div>

                    <div class="mb-3">
                        <input
                            v-model="applicationsSearch"
                            type="text"
                            class="form-control"
                            placeholder="Search applications by student name, student ID, status, job title, or company"
                        >
                    </div>

                    <div v-if="filteredJobApplications.length === 0" class="empty-state">
                        <div class="mb-2">
                            <i class="bi bi-inbox fs-3 text-secondary"></i>
                        </div>
                        <div class="fw-semibold mb-1">No applications found</div>
                        <div>
                            {{ jobApplications.length === 0 ? 'This job does not have any applications yet.' : 'Try a different search term.' }}
                        </div>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">Student</th>
                                    <th scope="col">Status</th>
                                    <th scope="col" class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in filteredJobApplications" :key="app.id">
                                    <td>
                                        <div class="fw-semibold">{{ app.student_name || 'Unknown student' }}</div>
                                        <div class="small text-muted">Student ID: {{ app.student_id || 'N/A' }}</div>
                                    </td>
                                    <td>
                                        <span class="badge" :class="badgeClass(app.status)">
                                            {{ app.status || 'Applied' }}
                                        </span>
                                    </td>
                                    <td class="text-end">
                                        <div class="d-flex flex-wrap justify-content-end gap-2">
                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-secondary"
                                                @click="$emit('view-resume', app.student_id, app.student_name)"
                                            >
                                                <i class="bi bi-file-earmark-pdf me-1"></i>Resume
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-primary"
                                                @click="$emit('update-application-status', app.id, 'Shortlisted')"
                                            >
                                                Shortlist
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-info"
                                                @click="requestInterviewForm(app.id)"
                                            >
                                                Interview
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-success"
                                                @click="$emit('update-application-status', app.id, 'Offer')"
                                            >
                                                Offer
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-outline-danger"
                                                @click="$emit('update-application-status', app.id, 'Rejected')"
                                            >
                                                Reject
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-dark"
                                                @click="$emit('open-finalize-form', app.id)"
                                            >
                                                Finalize
                                            </button>
                                        </div>

                                        <div
                                            v-if="interviewForm.appId === app.id"
                                            class="border rounded p-3 mt-3 text-start bg-light"
                                        >
                                            <div class="row g-3">
                                                <div class="col-12 col-md-6">
                                                    <label class="form-label">Interview Date & Time</label>
                                                    <input
                                                        v-model="interviewForm.interview_datetime"
                                                        type="datetime-local"
                                                        class="form-control"
                                                        required
                                                    >
                                                </div>

                                                <div class="col-12 col-md-6">
                                                    <label class="form-label">Mode</label>
                                                    <input
                                                        v-model="interviewForm.interview_mode"
                                                        type="text"
                                                        class="form-control"
                                                        placeholder="Online / Offline"
                                                    >
                                                </div>

                                                <div class="col-12">
                                                    <label class="form-label">Location / Link</label>
                                                    <input
                                                        v-model="interviewForm.interview_location"
                                                        type="text"
                                                        class="form-control"
                                                        placeholder="Google Meet link or office address"
                                                    >
                                                </div>

                                                <div class="col-12">
                                                    <label class="form-label">Notes</label>
                                                    <textarea
                                                        v-model="interviewForm.interview_notes"
                                                        class="form-control"
                                                        rows="2"
                                                        placeholder="Optional interview notes"
                                                    ></textarea>
                                                </div>

                                                <div class="col-12 d-flex gap-2">
                                                    <button
                                                        type="button"
                                                        class="btn btn-info btn-sm text-white"
                                                        @click="submitInterview(app.id)"
                                                    >
                                                        Confirm Interview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        class="btn btn-outline-secondary btn-sm"
                                                        @click="cancelInterview"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-if="placementForm.appId" class="section-card mb-4">
                <div class="card-body p-4">
                    <h5 class="section-title mb-3">
                        <i class="bi bi-award-fill me-2"></i>Finalize Placement
                    </h5>

                    <form @submit.prevent="$emit('finalize-placement')" novalidate>
                        <div class="row g-3">
                            <div class="col-12 col-lg-6">
                                <label class="form-label" for="placement-position">Position</label>
                                <input
                                    id="placement-position"
                                    v-model="placementForm.position"
                                    type="text"
                                    class="form-control"
                                    placeholder="Leave blank to use job title"
                                >
                            </div>

                            <div class="col-12 col-lg-6">
                                <label class="form-label" for="placement-salary">Salary</label>
                                <input
                                    id="placement-salary"
                                    v-model="placementForm.salary"
                                    type="text"
                                    class="form-control"
                                    placeholder="Enter numeric salary only"
                                >
                            </div>
                        </div>

                        <div class="mt-3">
                            <button type="submit" class="btn btn-success">
                                <i class="bi bi-check-circle-fill me-1"></i>Confirm Placement
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="section-card">
                <div class="card-body p-4">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <h5 class="section-title mb-0">
                            <i class="bi bi-trophy-fill me-2"></i>Finalized Placements
                        </h5>
                        <span class="soft-badge">{{ filteredCompanyPlacements.length }} shown</span>
                    </div>

                    <div class="mb-3">
                        <input
                            v-model="placementsSearch"
                            type="text"
                            class="form-control"
                            placeholder="Search placements by student name, position, salary, or company"
                        >
                    </div>

                    <div v-if="filteredCompanyPlacements.length === 0" class="empty-state">
                        <div class="mb-2">
                            <i class="bi bi-trophy fs-3 text-warning"></i>
                        </div>
                        <div class="fw-semibold mb-1">No placements found</div>
                        <div>
                            {{ companyPlacements.length === 0 ? 'Finalized offers will appear here after confirmation.' : 'Try a different search term.' }}
                        </div>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">Student</th>
                                    <th scope="col">Position</th>
                                    <th scope="col">Salary</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="placement in filteredCompanyPlacements" :key="placement.id">
                                    <td>{{ placement.student_name || 'N/A' }}</td>
                                    <td>{{ placement.position || 'N/A' }}</td>
                                    <td>{{ formatCurrency(placement.salary) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `
};