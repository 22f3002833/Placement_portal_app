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
        adminSection: {
            type: String,
            default: "overview"
        }
    },

    emits: ["approve-company", "logout"],

    methods: {
        statValue(key) {
            if (!this.adminStats || this.adminStats[key] === undefined || this.adminStats[key] === null) {
                return "—";
            }
            return this.adminStats[key];
        }
    },

    template: `
        <div class="dashboard-shell mt-4">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                    <div class="soft-badge mb-2">
                        <i class="bi bi-shield-lock me-1"></i>
                        Administrator
                    </div>
                    <h3 class="mb-1">Admin Dashboard</h3>
                    <p class="text-muted mb-0">
                        Monitor platform activity, review pending company registrations, and track portal growth.
                    </p>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <div class="text-muted small">
                        <i class="bi bi-person-circle me-1 text-primary"></i>
                        Logged in as <strong class="text-dark">admin</strong>
                    </div>
                    <button
                        type="button"
                        class="btn btn-outline-dark btn-sm"
                        @click="$emit('logout')"
                        aria-label="Logout from admin account"
                    >
                        <i class="bi bi-box-arrow-right me-1"></i>Logout
                    </button>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Total Students</span>
                            <i class="bi bi-mortarboard text-primary"></i>
                        </div>
                        <div class="stat-value">{{ statValue('total_students') }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Total Companies</span>
                            <i class="bi bi-buildings text-success"></i>
                        </div>
                        <div class="stat-value">{{ statValue('total_companies') }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Total Jobs</span>
                            <i class="bi bi-briefcase text-warning"></i>
                        </div>
                        <div class="stat-value">{{ statValue('total_jobs') }}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6 col-xl-3">
                    <div class="stat-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="stat-label">Total Applications</span>
                            <i class="bi bi-file-earmark-text text-danger"></i>
                        </div>
                        <div class="stat-value">{{ statValue('total_applications') }}</div>
                    </div>
                </div>
            </div>

            <div class="section-card">
                <div class="card-body p-4">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <div>
                            <h5 class="section-title mb-1">
                                <i class="bi bi-buildings me-2"></i>Pending Company Approvals
                            </h5>
                            <p class="text-muted mb-0">
                                Review company registrations that require admin approval before they can access the portal.
                            </p>
                        </div>
                        <span class="soft-badge">
                            {{ pendingCompanies.length }} pending
                        </span>
                    </div>

                    <div v-if="pendingCompanies.length === 0" class="empty-state">
                        <div class="mb-2">
                            <i class="bi bi-check2-circle fs-3 text-success"></i>
                        </div>
                        <div class="fw-semibold mb-1">No pending companies</div>
                        <div>All company registrations have been reviewed.</div>
                    </div>

                    <div v-else class="table-responsive">
                        <table class="table align-middle table-hover mb-0">
                            <caption class="caption-top text-muted pt-0">
                                Company accounts awaiting approval
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Company</th>
                                    <th scope="col">Industry</th>
                                    <th scope="col">Status</th>
                                    <th scope="col" class="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="company in pendingCompanies"
                                    :key="company.id"
                                >
                                    <td>
                                        <div class="fw-semibold">{{ company.name || 'Unnamed company' }}</div>
                                        <div class="small text-muted">ID: {{ company.id }}</div>
                                    </td>
                                    <td>{{ company.industry || 'N/A' }}</td>
                                    <td>
                                        <span class="badge bg-warning text-dark">Pending</span>
                                    </td>
                                    <td class="text-end">
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-success"
                                            @click="$emit('approve-company', company.id)"
                                            :aria-label="'Approve company ' + (company.name || company.id)"
                                        >
                                            <i class="bi bi-check2-circle me-1"></i>Approve
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `
};