window.StudentDashboardComponent = {
    props: {
        studentProfile: {
            type: Object,
            default: null
        },
        studentJobs: {
            type: Array,
            default: () => []
        },
        studentApplications: {
            type: Array,
            default: () => []
        },
        studentPlacements: {
            type: Array,
            default: () => []
        },
        resumeFile: {
            type: [Object, null],
            default: null
        }
    },

    emits: [
        "logout",
        "resume-file-change",
        "upload-resume",
        "view-own-resume",
        "apply-to-job",
        "download-offer-letter"
    ],

    data() {
        return {
            interviewSearch: "",
            jobsSearch: "",
            applicationsSearch: "",
            placementsSearch: ""
        };
    },

    computed: {
        normalizedStudentProfile() {
            return this.studentProfile || {};
        },

        resumeUploaded() {
            return !!(
                this.normalizedStudentProfile.resume_uploaded ||
                this.normalizedStudentProfile.resumeuploaded
            );
        },

        safeStudentJobs() {
            return Array.isArray(this.studentJobs) ? this.studentJobs : [];
        },

        safeStudentApplications() {
            return Array.isArray(this.studentApplications) ? this.studentApplications : [];
        },

        safeStudentPlacements() {
            return Array.isArray(this.studentPlacements) ? this.studentPlacements : [];
        },

        interviewApplications() {
            return this.safeStudentApplications.filter(app => {
                const status = String(app.status || "").trim();
                return status === "Interview" || status === "Shortlisted";
            });
        },

        filteredInterviewApplications() {
            const query = this.normalizeSearch(this.interviewSearch);
            if (!query) return this.interviewApplications;

            return this.interviewApplications.filter(app => {
                const haystack = [
                    this.companyName(app),
                    this.jobTitle(app),
                    app.status || "",
                    this.interviewMode(app),
                    this.interviewLocation(app),
                    this.interviewNotes(app),
                    this.formatInterviewDateTime(this.interviewDateTime(app))
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredStudentJobs() {
            const query = this.normalizeSearch(this.jobsSearch);
            if (!query) return this.safeStudentJobs;

            return this.safeStudentJobs.filter(job => {
                const haystack = [
                    this.companyName(job),
                    this.jobTitle(job),
                    job.title || "",
                    job.description || "",
                    job.salary || ""
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredStudentApplications() {
            const query = this.normalizeSearch(this.applicationsSearch);
            if (!query) return this.safeStudentApplications;

            return this.safeStudentApplications.filter(app => {
                const haystack = [
                    this.companyName(app),
                    this.jobTitle(app),
                    app.status || ""
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            });
        },

        filteredStudentPlacements() {
            const query = this.normalizeSearch(this.placementsSearch);
            if (!query) return this.safeStudentPlacements;

            return this.safeStudentPlacements.filter(placement => {
                const haystack = [
                    this.companyName(placement),
                    placement.position || "",
                    placement.salary || "",
                    this.placementCompanyId(placement)
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

        badgeClass(status) {
            return window.api.badgeClass(status);
        },

        formatCurrency(value) {
            return window.api.formatCurrency(value);
        },

        companyName(item) {
            return item.company_name || item.companyname || item.company || "N/A";
        },

        jobTitle(item) {
            return item.job_title || item.jobtitle || item.title || "N/A";
        },

        placementCompanyId(item) {
            return item.company_id || item.companyid || "N/A";
        },

        shortText(value, max = 120) {
            if (!value) return "No description available";
            return value.length > max ? value.slice(0, max) + "..." : value;
        },

        interviewDateTime(item) {
            return (
                item.interview_datetime ||
                item.interviewDateTime ||
                item.interview_date_time ||
                null
            );
        },

        interviewMode(item) {
            return (
                item.interview_mode ||
                item.interviewMode ||
                "Not specified"
            );
        },

        interviewLocation(item) {
            return (
                item.interview_location ||
                item.interviewLocation ||
                item.interview_link ||
                item.interviewLink ||
                "Not specified"
            );
        },

        interviewNotes(item) {
            return (
                item.interview_notes ||
                item.interviewNotes ||
                "No additional notes"
            );
        },

        formatInterviewDateTime(value) {
            if (!value) return "To be announced";

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;

            return date.toLocaleString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });
        },

        downloadOfferLetter(placementId) {
            this.$emit("download-offer-letter", placementId);
        }
    },

    template: `
        <div class="mt-4">
            <div class="alert alert-light border d-flex justify-content-between align-items-center mb-4">
                <span>
                    <i class="bi bi-person-circle me-2 text-primary"></i>
                    Logged in as: <strong class="text-capitalize">student</strong>
                </span>
                <button class="btn btn-sm btn-outline-dark" @click="$emit('logout')">
                    <i class="bi bi-box-arrow-right me-1"></i>Logout
                </button>
            </div>

            <h4 class="mb-3"><i class="bi bi-person-workspace me-2"></i>Student Dashboard</h4>

            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="card shadow-sm h-100 border-0">
                        <div class="card-body">
                            <h6 class="text-muted">Resume Status</h6>
                            <span class="badge fs-6" :class="resumeUploaded ? 'bg-success' : 'bg-danger'">
                                {{ resumeUploaded ? 'Uploaded' : 'Not Uploaded' }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm h-100 border-0">
                        <div class="card-body">
                            <h6 class="text-muted">Applications</h6>
                            <h3 class="mb-0">{{ safeStudentApplications.length }}</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm h-100 border-0">
                        <div class="card-body">
                            <h6 class="text-muted">Interview / Shortlisted</h6>
                            <h3 class="mb-0">{{ interviewApplications.length }}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <h5 class="mb-3"><i class="bi bi-person-vcard-fill me-2"></i>Profile</h5>
                    <p class="mb-1"><strong>Name:</strong> {{ normalizedStudentProfile.name || '-' }}</p>
                    <p class="mb-1"><strong>Department:</strong> {{ normalizedStudentProfile.department || '-' }}</p>
                    <p class="mb-0">
                        <strong>Resume Status:</strong>
                        <span :class="resumeUploaded ? 'text-success' : 'text-danger'">
                            {{ resumeUploaded ? 'Uploaded' : 'Not Uploaded' }}
                        </span>
                    </p>
                </div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <h5 class="mb-3"><i class="bi bi-file-earmark-arrow-up-fill me-2"></i>Resume</h5>

                    <div v-if="!resumeUploaded" class="alert alert-warning">
                        You must upload your resume before applying for any job.
                    </div>

                    <div class="mb-3">
                        <input
                            id="resumeFileInput"
                            type="file"
                            class="form-control"
                            @change="$emit('resume-file-change', $event)"
                        >
                    </div>

                    <button class="btn btn-primary me-2" @click="$emit('upload-resume')">
                        <i class="bi bi-upload me-1"></i>Upload Resume
                    </button>
                    <button class="btn btn-outline-secondary" @click="$emit('view-own-resume')">
                        <i class="bi bi-eye-fill me-1"></i>View Resume
                    </button>
                </div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                        <h5 class="mb-0"><i class="bi bi-calendar-event-fill me-2"></i>Interview Schedule</h5>
                        <input
                            v-model="interviewSearch"
                            type="text"
                            class="form-control"
                            style="max-width: 320px;"
                            placeholder="Search company, role, status, notes..."
                        >
                    </div>

                    <div v-if="filteredInterviewApplications.length === 0" class="text-muted">
                        No interview or shortlist updates found.
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Company</th>
                                    <th>Job Title</th>
                                    <th>Status</th>
                                    <th>Next Step</th>
                                    <th>Interview Time</th>
                                    <th>Mode</th>
                                    <th>Location / Link</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in filteredInterviewApplications" :key="'interview-' + app.id">
                                    <td>{{ companyName(app) }}</td>
                                    <td>{{ jobTitle(app) }}</td>
                                    <td>
                                        <span class="badge" :class="badgeClass(app.status)">
                                            {{ app.status || 'N/A' }}
                                        </span>
                                    </td>
                                    <td>
                                        <span v-if="app.status === 'Interview'">Prepare for your scheduled interview</span>
                                        <span v-else-if="app.status === 'Shortlisted'">You are shortlisted. Interview details may be shared soon.</span>
                                        <span v-else>-</span>
                                    </td>
                                    <td>{{ formatInterviewDateTime(interviewDateTime(app)) }}</td>
                                    <td>{{ interviewMode(app) }}</td>
                                    <td class="text-break">{{ interviewLocation(app) }}</td>
                                    <td class="text-break">{{ interviewNotes(app) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                        <h5 class="mb-0"><i class="bi bi-briefcase-fill me-2"></i>Available Jobs</h5>
                        <input
                            v-model="jobsSearch"
                            type="text"
                            class="form-control"
                            style="max-width: 320px;"
                            placeholder="Search company, title, description..."
                        >
                    </div>

                    <div v-if="filteredStudentJobs.length === 0" class="text-muted">
                        No matching active jobs found.
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Company</th>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Salary</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="job in filteredStudentJobs" :key="job.id">
                                    <td>{{ companyName(job) }}</td>
                                    <td>{{ job.title || 'N/A' }}</td>
                                    <td>{{ shortText(job.description) }}</td>
                                    <td>{{ formatCurrency(job.salary) }}</td>
                                    <td>
                                        <button
                                            class="btn btn-sm btn-success"
                                            @click="$emit('apply-to-job', job.id)"
                                            :disabled="!resumeUploaded"
                                        >
                                            <i class="bi bi-send-fill me-1"></i>Apply
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                        <h5 class="mb-0"><i class="bi bi-journal-check me-2"></i>My Applications</h5>
                        <input
                            v-model="applicationsSearch"
                            type="text"
                            class="form-control"
                            style="max-width: 320px;"
                            placeholder="Search company, role, status..."
                        >
                    </div>

                    <div v-if="filteredStudentApplications.length === 0" class="text-muted">
                        No matching applications found.
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Company</th>
                                    <th>Job Title</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in filteredStudentApplications" :key="app.id">
                                    <td>{{ companyName(app) }}</td>
                                    <td>{{ jobTitle(app) }}</td>
                                    <td>
                                        <span class="badge" :class="badgeClass(app.status)">
                                            {{ app.status || 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                        <h5 class="mb-0"><i class="bi bi-patch-check-fill me-2"></i>My Placements</h5>
                        <input
                            v-model="placementsSearch"
                            type="text"
                            class="form-control"
                            style="max-width: 320px;"
                            placeholder="Search company, position, salary, company ID..."
                        >
                    </div>

                    <div v-if="filteredStudentPlacements.length === 0" class="text-muted">
                        No matching placements found.
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Company</th>
                                    <th>Position</th>
                                    <th>Salary</th>
                                    <th>Company ID</th>
                                    <th>Offer Letter</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="placement in filteredStudentPlacements" :key="placement.id">
                                    <td>{{ companyName(placement) }}</td>
                                    <td>{{ placement.position || 'N/A' }}</td>
                                    <td>{{ formatCurrency(placement.salary) }}</td>
                                    <td>{{ placementCompanyId(placement) }}</td>
                                    <td>
                                        <button
                                            class="btn btn-sm btn-primary"
                                            @click="downloadOfferLetter(placement.id)"
                                        >
                                            <i class="bi bi-file-earmark-pdf-fill me-1"></i>Download PDF
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p class="text-muted small mt-2 mb-0">
                            Click <strong>Download PDF</strong> to get your offer letter for company or college submission.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `
};