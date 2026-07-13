window.LoginComponent = {
    props: {
        loginForm: {
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
            default: "login"
        }
    },

    emits: ["switch-view", "submit-login"],

    template: `
        <div class="row g-0 align-items-stretch">
            <div class="col-lg-5">
                <div class="auth-panel auth-side d-flex flex-column justify-content-between">
                    <div>
                        <div class="feature-pill">
                            <i class="bi bi-shield-check"></i>
                            Role-based access
                        </div>
                        <h3 class="display-6 fw-bold mb-3">Welcome back</h3>
                        <p class="text-white-50 mb-4">
                            Sign in to manage placements, applications, approvals, and hiring activity from one portal.
                        </p>
                    </div>

                    <div class="glass-card p-3 text-dark">
                        <div class="small text-uppercase text-muted fw-semibold mb-2">Portal access</div>
                        <div class="d-flex flex-column gap-2">
                            <div><i class="bi bi-person-badge me-2 text-primary"></i>Admin approval workflows</div>
                            <div><i class="bi bi-building me-2 text-primary"></i>Company job posting and tracking</div>
                            <div><i class="bi bi-mortarboard me-2 text-primary"></i>Student applications and resume upload</div>
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
                        <h4 class="fw-bold mb-2">Sign in</h4>
                        <p class="text-muted mb-0">
                            Use your username or email and password to access your account.
                        </p>
                    </div>

                    <div v-if="message" class="alert alert-success" role="alert">{{ message }}</div>
                    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

                    <form @submit.prevent="$emit('submit-login')" novalidate>
                        <div class="mb-3">
                            <label class="form-label" for="login-username">Username or email</label>
                            <input
                                id="login-username"
                                v-model.trim="loginForm.username"
                                type="text"
                                class="form-control"
                                placeholder="Enter username or email"
                                autocomplete="username"
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label class="form-label" for="login-password">Password</label>
                            <input
                                id="login-password"
                                v-model="loginForm.password"
                                type="password"
                                class="form-control"
                                placeholder="Enter password"
                                autocomplete="current-password"
                                required
                            >
                        </div>

                        <button type="submit" class="btn btn-primary w-100">
                            <i class="bi bi-box-arrow-in-right me-1"></i>Login
                        </button>
                    </form>

                    <div class="text-center text-muted small mt-4">
                        New here?
                        <button
                            type="button"
                            class="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
                            @click="$emit('switch-view', 'register')"
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};