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
        "apply-to-job"
    ],

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
        }
    },

    methods: {
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

        studentName(item) {
            return item.name || item.student_name || item.studentname || "N/A";
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
                    <h5 class="mb-3"><i class="bi bi-calendar-event-fill me-2"></i>Interview Schedule</h5>

                    <div v-if="interviewApplications.length === 0" class="text-muted">
                        No interview or shortlist updates yet.
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
                                <tr v-for="app in interviewApplications" :key="'interview-' + app.id">
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
                    <h5 class="mb-3"><i class="bi bi-briefcase-fill me-2"></i>Available Jobs</h5>

                    <div v-if="safeStudentJobs.length === 0" class="text-muted">
                        No active jobs available.
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
                                <tr v-for="job in safeStudentJobs" :key="job.id">
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
                    <h5 class="mb-3"><i class="bi bi-journal-check me-2"></i>My Applications</h5>

                    <div v-if="safeStudentApplications.length === 0" class="text-muted">
                        No applications yet.
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
                                <tr v-for="app in safeStudentApplications" :key="app.id">
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
                    <h5 class="mb-3"><i class="bi bi-patch-check-fill me-2"></i>My Placements</h5>

                    <div v-if="safeStudentPlacements.length === 0" class="text-muted">
                        No placements yet.
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Position</th>
                                    <th>Salary</th>
                                    <th>Company ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="placement in safeStudentPlacements" :key="placement.id">
                                    <td>{{ placement.position || 'N/A' }}</td>
                                    <td>{{ formatCurrency(placement.salary) }}</td>
                                    <td>{{ placementCompanyId(placement) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `
};