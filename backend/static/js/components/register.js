window.RegisterComponent = {
    props: {
        registerForm: {
            type: Object,
            required: true
        },
        message: {
            type: String,
            default: ""
        },
        error: {
            type: String,
            default: ""
        },
        currentView: {
            type: String,
            default: "register"
        }
    },

    emits: ["switch-view", "submit-register"],

    template: `
        <div class="row g-0 align-items-stretch">
            <div class="col-lg-5">
                <div class="auth-panel auth-side d-flex flex-column justify-content-between">
                    <div>
                        <div class="feature-pill">
                            <i class="bi bi-person-plus"></i>
                            New account setup
                        </div>
                        <h3 class="display-6 fw-bold mb-3">Create your portal account</h3>
                        <p class="text-white-50 mb-4">
                            Register as a student to apply for jobs, or as a company to post openings and manage applicants.
                        </p>
                    </div>

                    <div class="glass-card p-3 text-dark">
                        <div class="small text-uppercase text-muted fw-semibold mb-2">Registration flow</div>
                        <div class="d-flex flex-column gap-2">
                            <div><i class="bi bi-mortarboard me-2 text-primary"></i>Students get immediate access after registration</div>
                            <div><i class="bi bi-building me-2 text-primary"></i>Companies require admin approval before login access</div>
                            <div><i class="bi bi-envelope-check me-2 text-primary"></i>Use valid account details for future communication</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-7">
                <div class="auth-panel">
                    <div class="d-flex justify-content-center justify-content-lg-start mb-4">
                        <div class="btn-group" role="tablist" aria-label="Authentication views">
                            <button
                                type="button"
                                class="btn"
                                :class="currentView === 'login' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="$emit('switch-view', 'login')"
                            >
                                <i class="bi bi-box-arrow-in-right me-1"></i>Login
                            </button>
                            <button
                                type="button"
                                class="btn"
                                :class="currentView === 'register' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="$emit('switch-view', 'register')"
                            >
                                <i class="bi bi-person-plus-fill me-1"></i>Register
                            </button>
                        </div>
                    </div>

                    <div class="mb-4">
                        <h4 class="fw-bold mb-2">Create account</h4>
                        <p class="text-muted mb-0">
                            Fill in the required details below to create your portal account.
                        </p>
                    </div>

                    <div v-if="message" class="alert alert-success" role="alert">{{ message }}</div>
                    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

                    <form @submit.prevent="$emit('submit-register')" novalidate>
                        <div class="mb-3">
                            <label class="form-label" for="register-role">Register as</label>
                            <select
                                id="register-role"
                                v-model="registerForm.role"
                                class="form-select"
                                aria-describedby="register-role-help"
                            >
                                <option value="student">Student</option>
                                <option value="company">Company</option>
                            </select>
                            <div id="register-role-help" class="form-text">
                                Students can access the portal after signup. Company accounts wait for admin approval.
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="register-username">Username</label>
                            <input
                                id="register-username"
                                v-model.trim="registerForm.username"
                                type="text"
                                class="form-control"
                                placeholder="Choose a username"
                                autocomplete="username"
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="register-email">Email</label>
                            <input
                                id="register-email"
                                v-model.trim="registerForm.email"
                                type="email"
                                class="form-control"
                                placeholder="Enter your email address"
                                autocomplete="email"
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="register-password">Password</label>
                            <input
                                id="register-password"
                                v-model="registerForm.password"
                                type="password"
                                class="form-control"
                                placeholder="Create a password"
                                autocomplete="new-password"
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="register-name">
                                {{ registerForm.role === 'student' ? 'Full name' : 'Company name' }}
                            </label>
                            <input
                                id="register-name"
                                v-model.trim="registerForm.name"
                                type="text"
                                class="form-control"
                                :placeholder="registerForm.role === 'student' ? 'Enter your full name' : 'Enter company name'"
                                autocomplete="name"
                                required
                            >
                        </div>

                        <div v-if="registerForm.role === 'student'" class="mb-3">
                            <label class="form-label" for="register-department">Department</label>
                            <input
                                id="register-department"
                                v-model.trim="registerForm.department"
                                type="text"
                                class="form-control"
                                placeholder="e.g. Computer Science"
                                required
                            >
                        </div>

                        <div v-if="registerForm.role === 'company'" class="mb-3">
                            <label class="form-label" for="register-industry">Industry</label>
                            <input
                                id="register-industry"
                                v-model.trim="registerForm.industry"
                                type="text"
                                class="form-control"
                                placeholder="e.g. Software, Finance, Manufacturing"
                                required
                            >
                        </div>

                        <button type="submit" class="btn btn-success w-100">
                            <i class="bi bi-check-circle-fill me-1"></i>Create account
                        </button>
                    </form>

                    <div class="text-center text-muted small mt-4">
                        Already have an account?
                        <button
                            type="button"
                            class="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
                            @click="$emit('switch-view', 'login')"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};