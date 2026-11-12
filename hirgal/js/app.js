
/* =====================================
   HIRGAL - MAIN APPLICATION
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const $ = (selector) => document.querySelector(selector);

    const $$ = (selector) => document.querySelectorAll(selector);

    const money = (amount) =>
        Number(amount || 0).toFixed(2);

    const makeId = () =>
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);

    let activeCourseId = null;

    /* =====================================
       GENERAL HELPERS
    ===================================== */

    function showMessage(selector, message, success = false) {
        const element = $(selector);
        if (!element) return;

        element.textContent = message;
        element.className = success
            ? "form-message success"
            : "form-message";
    }

    function getUser() {
        return HirgalStorage.getCurrentUser();
    }

    function getData(type) {
        return HirgalStorage.getUserData(type, []);
    }

    function saveData(type, value) {
        HirgalStorage.saveUserData(type, value);
    }

    function addActivity(message) {
        const activities = getData("activities");
        activities.unshift({
            id: makeId(),
            message,
            date: new Date().toLocaleString()
        });

        saveData("activities", activities.slice(0, 10));
    }

    function formatName(name) {
        return escapeHTML(name);
    }

    /* =====================================
       PAGE NAVIGATION
    ===================================== */

    function showPublicPage() {
        $("#publicNavbar")?.classList.remove("hidden");
        $("#publicPage")?.classList.remove("hidden");
        $("#publicFooter")?.classList.remove("hidden");
        $("#authPage")?.classList.add("hidden");
        $("#dashboardPage")?.classList.add("hidden");
    }

    function showAuthPage(page) {
        $("#publicNavbar")?.classList.add("hidden");
        $("#publicPage")?.classList.add("hidden");
        $("#publicFooter")?.classList.add("hidden");
        $("#authPage")?.classList.remove("hidden");
        $("#dashboardPage")?.classList.add("hidden");

        $("#loginForm")?.classList.toggle("hidden", page !== "login");
        $("#registerForm")?.classList.toggle("hidden", page !== "register");
    }

    function showDashboard() {
        $("#publicNavbar")?.classList.add("hidden");
        $("#publicPage")?.classList.add("hidden");
        $("#publicFooter")?.classList.add("hidden");
        $("#authPage")?.classList.add("hidden");
        $("#dashboardPage")?.classList.remove("hidden");

        updateUserInformation();
        showView("dashboard");
        refreshDashboard();
    }

    function navigate(page) {
        if (page === "home") {
            if (getUser()) {
                showDashboard();
                return;
            }
            showPublicPage();
            return;
        }

        if (page === "login" || page === "register") {
            showAuthPage(page);
            return;
        }

        if (getUser()) {
            showDashboard();
            showView(page);
        } else {
            showAuthPage("login");
        }
    }

    document.addEventListener("click", event => {
        const pageLink = event.target.closest("[data-page]");

        if (pageLink) {
            event.preventDefault();
            navigate(pageLink.dataset.page);
            return;
        }

        const viewButton = event.target.closest("[data-view]");

        if (viewButton) {
            showView(viewButton.dataset.view);
        }
    });

    function showView(view) {
        const validViews = [
            "dashboard", "foodbiz", "shementor", "bizpath", "profile"
        ];

        if (!validViews.includes(view)) return;

        $$(".dashboard-view").forEach(section => {
            section.classList.add("hidden");
        });

        $(`#view-${view}`)?.classList.remove("hidden");

        $$(".sidebar-link[data-view]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.view === view
            );
        });

        const titles = {
            dashboard: "Dashboard",
            foodbiz: "FoodBiz",
            shementor: "SheMentor",
            bizpath: "BizPath",
            profile: "My Profile"
        };

        $("#pageTitle").textContent = titles[view];

        if (view === "foodbiz") refreshFoodBiz();
        if (view === "shementor") renderMentors();
        if (view === "bizpath") renderCourses();
        if (view === "profile") renderProfile();
    }

    /* =====================================
       REGISTRATION
    ===================================== */

    $("#registerForm").addEventListener("submit", event => {
        event.preventDefault();

        const name = $("#registerName").value.trim();
        const email = $("#registerEmail").value.trim().toLowerCase();
        const password = $("#registerPassword").value;
        const confirmPassword = $("#confirmPassword").value;

        if (!name || !email || !password || !confirmPassword) {
            return showMessage("#registerMessage", "Please complete every field.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return showMessage("#registerMessage", "Please enter a valid email address.");
        }

        if (password.length < 6) {
            return showMessage("#registerMessage", "Password must contain at least 6 characters.");
        }

        if (password !== confirmPassword) {
            return showMessage("#registerMessage", "Passwords do not match.");
        }

        const users = HirgalStorage.getUsers();

        if (users.some(user => user.email === email)) {
            return showMessage("#registerMessage", "An account with this email already exists.");
        }

        const user = {
            id: makeId(),
            name,
            email
        };

        // DEMO ONLY: Never store real passwords in LocalStorage.
        // This prototype stores a demo password for demonstration purposes.
        user.password = password;

        users.push(user);

        if (!HirgalStorage.saveUsers(users)) {
            return showMessage("#registerMessage", "Unable to save your account in this browser.");
        }

        HirgalStorage.setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email
        });

        addActivity("Your Hirgal account was created.");

        $("#registerForm").reset();
        showDashboard();
    });

    /* =====================================
       LOGIN
    ===================================== */

    $("#loginForm").addEventListener("submit", event => {
        event.preventDefault();

        const email = $("#loginEmail").value.trim().toLowerCase();
        const password = $("#loginPassword").value;

        const users = HirgalStorage.getUsers();

        const user = users.find(item =>
            item.email === email && item.password === password
        );

        if (!user) {
            return showMessage(
                "#loginMessage",
                "Incorrect email or password. Please try again."
            );
        }

        HirgalStorage.setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email
        });

        $("#loginForm").reset();
        showDashboard();
    });

    /* =====================================
       LOGOUT
    ===================================== */

    $("#logoutBtn").addEventListener("click", () => {
        HirgalStorage.logout();
        navigate("home");
    });

    /* =====================================
       USER INFORMATION
    ===================================== */

    function updateUserInformation() {
        const user = getUser();
        if (!user) return;

        $("#welcomeName").textContent = user.name;
        $("#topbarUserName").textContent = user.name;

        $("#userInitials").textContent = user.name
            .split(" ")
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    /* =====================================
       DASHBOARD STATISTICS
    ===================================== */

    function getFinancialSummary() {
        const sales = getData("sales");
        const expenses = getData("expenses");

        const revenue = sales.reduce(
            (total, sale) => total + Number(sale.total), 0
        );

        const expenseTotal = expenses.reduce(
            (total, expense) => total + Number(expense.amount), 0
        );

        return {
            revenue,
            expenses: expenseTotal,
            profit: revenue - expenseTotal
        };
    }

    function refreshDashboard() {
        const products = getData("products");
        const summary = getFinancialSummary();

        $("#totalProducts").textContent = products.length;
        $("#totalSales").textContent = money(summary.revenue);
        $("#totalExpenses").textContent = money(summary.expenses);
        $("#totalProfit").textContent = money(summary.profit);

        renderActivities();
    }

    function renderActivities() {
        const activities = getData("activities");
        const container = $("#recentActivity");

        if (!activities.length) {
            container.innerHTML = "<p>No recent activity yet.</p>";
            return;
        }

        container.innerHTML = activities.slice(0, 8).map(activity => `
            <div class="activity-item">
                <p>${escapeHTML(activity.message)}</p>
                <small>${escapeHTML(activity.date)}</small>
            </div>
        `).join("");
    }

    /* =====================================
       FOODBIZ - PRODUCTS
    ===================================== */

    function renderProducts() {
        const products = getData("products");
        const container = $("#productList");

        if (!products.length) {
            container.innerHTML = "<p>No products added yet.</p>";
        } else {
            container.innerHTML = products.map(product => `
                <article class="data-card">
                    <div>
                        <h4>${escapeHTML(product.name)}</h4>
                        <p>${escapeHTML(product.description || "No description")}</p>
                        <p>Price: ${money(product.price)} | Stock: ${product.quantity}</p>
                    </div>

                    <div class="card-actions">
                        <button class="small-btn secondary"
                            data-edit-product="${escapeHTML(product.id)}">
                            Edit
                        </button>
                        <button class="small-btn danger"
                            data-delete-product="${escapeHTML(product.id)}">
                            Delete
                        </button>
                    </div>
                </article>
            `).join("");
        }

        renderSaleOptions();
    }

    $("#productForm").addEventListener("submit", event => {
        event.preventDefault();

        const id = $("#productId").value;
        const name = $("#productName").value.trim();
        const description = $("#productDescription").value.trim();
        const price = Number($("#productPrice").value);
        const quantity = Number($("#productQuantity").value);

        if (!name || price < 0 || quantity < 0 ||
            !Number.isFinite(price) || !Number.isInteger(quantity)) {
            alert("Please enter valid product details.");
            return;
        }

        const products = getData("products");

        if (id) {
            const index = products.findIndex(product => product.id === id);

            if (index === -1) return;

            products[index] = {
                ...products[index],
                name,
                description,
                price,
                quantity
            };

            addActivity(`Updated product: ${name}`);
        } else {
            products.push({
                id: makeId(),
                name,
                description,
                price,
                quantity
            });

            addActivity(`Added product: ${name}`);
        }

        saveData("products", products);

        $("#productForm").reset();
        $("#productId").value = "";
        $("#productSubmitBtn").textContent = "Add Product";

        refreshFoodBiz();
    });

    $("#productList").addEventListener("click", event => {
        const editButton = event.target.closest("[data-edit-product]");
        const deleteButton = event.target.closest("[data-delete-product]");

        const products = getData("products");

        if (editButton) {
            const product = products.find(
                item => item.id === editButton.dataset.editProduct
            );

            if (!product) return;

            $("#productId").value = product.id;
            $("#productName").value = product.name;
            $("#productDescription").value = product.description;
            $("#productPrice").value = product.price;
            $("#productQuantity").value = product.quantity;
            $("#productSubmitBtn").textContent = "Update Product";

            $("#productForm").scrollIntoView({ behavior: "smooth" });
        }

        if (deleteButton) {
            const id = deleteButton.dataset.deleteProduct;

            if (!confirm("Delete this product?")) return;

            const updated = products.filter(product => product.id !== id);

            saveData("products", updated);
            addActivity("Deleted a product.");

            refreshFoodBiz();
        }
    });

    /* =====================================
       FOODBIZ - SALES
    ===================================== */

    function renderSaleOptions() {
        const select = $("#saleProduct");
        const previousValue = select.value;
        const products = getData("products");

        select.innerHTML = `
            <option value="">Choose a product</option>
            ${products.filter(product => product.quantity > 0).map(product => `
                <option value="${escapeHTML(product.id)}">
                    ${escapeHTML(product.name)} (${product.quantity} available)
                </option>
            `).join("")}
        `;

        if (products.some(product => product.id === previousValue && product.quantity > 0)) {
            select.value = previousValue;
        }

        updateSaleTotal();
    }

    function updateSaleTotal() {
        const products = getData("products");
        const product = products.find(item => item.id === $("#saleProduct").value);
        const quantity = Number($("#saleQuantity").value) || 0;

        const total = product ? product.price * quantity : 0;

        $("#saleTotal").textContent = `Sale total: ${money(total)}`;
    }

    $("#saleProduct").addEventListener("change", updateSaleTotal);
    $("#saleQuantity").addEventListener("input", updateSaleTotal);

    $("#saleForm").addEventListener("submit", event => {
        event.preventDefault();

        const productId = $("#saleProduct").value;
        const quantity = Number($("#saleQuantity").value);

        const products = getData("products");
        const product = products.find(item => item.id === productId);

        if (!product) {
            alert("Please select a valid product.");
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            alert("Enter a valid sale quantity.");
            return;
        }

        if (quantity > product.quantity) {
            alert("Not enough stock available.");
            return;
        }

        const total = product.price * quantity;

        product.quantity -= quantity;
        saveData("products", products);

        const sales = getData("sales");

        sales.unshift({
            id: makeId(),
            productId,
            productName: product.name,
            quantity,
            total,
            date: new Date().toLocaleString()
        });

        saveData("sales", sales);

        addActivity(`Recorded a sale of ${quantity} ${product.name}.`);

        $("#saleForm").reset();
        refreshFoodBiz();
    });

    function renderSales() {
        const sales = getData("sales");
        const container = $("#salesList");

        container.innerHTML = sales.length
            ? sales.map(sale => `
                <article class="data-card">
                    <div>
                        <h4>${escapeHTML(sale.productName)}</h4>
                        <p>Quantity: ${sale.quantity} | Total: ${money(sale.total)}</p>
                        <p>${escapeHTML(sale.date)}</p>
                    </div>
                </article>
            `).join("")
            : "<p>No sales recorded yet.</p>";
    }

    /* =====================================
       FOODBIZ - EXPENSES
    ===================================== */

    $("#expenseDate").value = new Date().toISOString().split("T")[0];

    $("#expenseForm").addEventListener("submit", event => {
        event.preventDefault();

        const name = $("#expenseName").value.trim();
        const amount = Number($("#expenseAmount").value);
        const date = $("#expenseDate").value;

        if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
            alert("Please enter valid expense details.");
            return;
        }

        const expenses = getData("expenses");

        expenses.unshift({
            id: makeId(),
            name,
            amount,
            date
        });

        saveData("expenses", expenses);
        addActivity(`Added expense: ${name}`);

        $("#expenseForm").reset();
        $("#expenseDate").value = new Date().toISOString().split("T")[0];

        refreshFoodBiz();
    });

    function renderExpenses() {
        const expenses = getData("expenses");
        const container = $("#expenseList");

        container.innerHTML = expenses.length
            ? expenses.map(expense => `
                <article class="data-card">
                    <div>
                        <h4>${escapeHTML(expense.name)}</h4>
                        <p>Amount: ${money(expense.amount)}</p>
                        <p>Date: ${escapeHTML(expense.date)}</p>
                    </div>

                    <button class="small-btn danger"
                        data-delete-expense="${escapeHTML(expense.id)}">
                        Delete
                    </button>
                </article>
            `).join("")
            : "<p>No expenses recorded yet.</p>";
    }

    $("#expenseList").addEventListener("click", event => {
        const button = event.target.closest("[data-delete-expense]");
        if (!button) return;

        if (!confirm("Delete this expense?")) return;

        const expenses = getData("expenses").filter(
            expense => expense.id !== button.dataset.deleteExpense
        );

        saveData("expenses", expenses);
        addActivity("Deleted an expense.");

        refreshFoodBiz();
    });

    function refreshFoodBiz() {
        const summary = getFinancialSummary();

        $("#foodRevenue").textContent = money(summary.revenue);
        $("#foodExpenses").textContent = money(summary.expenses);
        $("#foodProfit").textContent = money(summary.profit);

        renderProducts();
        renderSales();
        renderExpenses();
        refreshDashboard();
    }

    /* =====================================
       SHEMENTOR - MENTORS
    ===================================== */

    function renderMentors() {
        const search = ($("#mentorSearch").value || "").toLowerCase().trim();
        const category = $("#mentorCategory").value;

        const mentors = HirgalData.mentors.filter(mentor => {
            const matchesSearch =
                mentor.name.toLowerCase().includes(search) ||
                mentor.title.toLowerCase().includes(search) ||
                mentor.category.toLowerCase().includes(search);

            const matchesCategory =
                !category || mentor.category === category;

            return matchesSearch && matchesCategory;
        });

        const container = $("#mentorList");

        container.innerHTML = mentors.length
            ? mentors.map(mentor => `
                <article class="mentor-card">
                    <div class="mentor-avatar">
                        ${escapeHTML(mentor.name.charAt(0))}
                    </div>

                    <h3>${escapeHTML(mentor.name)}</h3>
                    <p>${escapeHTML(mentor.title)}</p>

                    <span class="category-tag">
                        ${escapeHTML(mentor.category)}
                    </span>

                    <p>${escapeHTML(mentor.bio)}</p>
                    <small>${escapeHTML(mentor.availability)}</small>

                    <button class="signup-btn"
                        data-request-mentor="${escapeHTML(mentor.id)}">
                        Request Mentorship
                    </button>
                </article>
            `).join("")
            : "<p>No mentors match your search.</p>";

        renderMentorshipRequests();
    }

    $("#mentorSearch").addEventListener("input", renderMentors);
    $("#mentorCategory").addEventListener("change", renderMentors);

    $("#mentorList").addEventListener("click", event => {
        const button = event.target.closest("[data-request-mentor]");
        if (!button) return;

        const mentor = HirgalData.mentors.find(
            item => item.id === button.dataset.requestMentor
        );

        if (!mentor) return;

        $("#selectedMentorId").value = mentor.id;
        $("#selectedMentorName").textContent = mentor.name;
        $("#mentorMessage").value = "";

        $("#mentorModal").classList.remove("hidden");
    });

    function closeMentorModal() {
        $("#mentorModal").classList.add("hidden");
    }

    $("#closeMentorModal").addEventListener("click", closeMentorModal);

    $("#mentorModal").addEventListener("click", event => {
        if (event.target.id === "mentorModal") {
            closeMentorModal();
        }
    });

    $("#mentorRequestForm").addEventListener("submit", event => {
        event.preventDefault();

        const mentorId = $("#selectedMentorId").value;
        const message = $("#mentorMessage").value.trim();

        if (!message) return;

        const mentor = HirgalData.mentors.find(
            item => item.id === mentorId
        );

        if (!mentor) return;

        const requests = getData("mentorshipRequests");

        requests.unshift({
            id: makeId(),
            mentorId,
            mentorName: mentor.name,
            message,
            status: "Pending",
            date: new Date().toLocaleString()
        });

        saveData("mentorshipRequests", requests);

        addActivity(`Sent a mentorship request to ${mentor.name}.`);

        $("#mentorRequestForm").reset();
        closeMentorModal();
        renderMentorshipRequests();

        alert("Your demo mentorship request has been saved!");
    });

    function renderMentorshipRequests() {
        const requests = getData("mentorshipRequests");
        const container = $("#mentorshipRequests");

        if (!container) return;

        container.innerHTML = requests.length
            ? requests.map(request => `
                <article class="data-card">
                    <div>
                        <h4>${escapeHTML(request.mentorName)}</h4>
                        <p>${escapeHTML(request.message)}</p>
                        <p>Status: ${escapeHTML(request.status)}</p>
                        <small>${escapeHTML(request.date)}</small>
                    </div>
                </article>
            `).join("")
            : "<p>You haven't sent any mentorship requests yet.</p>";
    }

    /* =====================================
       BIZPATH - COURSES
    ===================================== */

    function getCompletedLessons() {
        return getData("completedLessons");
    }

    function saveCompletedLesson(lessonId, completed) {
        let lessons = getCompletedLessons();

        if (completed && !lessons.includes(lessonId)) {
            lessons.push(lessonId);
        } else if (!completed) {
            lessons = lessons.filter(id => id !== lessonId);
        }

        saveData("completedLessons", lessons);
        renderCourses();

        if (activeCourseId) {
            renderLessons(activeCourseId);
        }
    }

    function renderCourses() {
        const completed = getCompletedLessons();

        const allLessons = HirgalData.courses.reduce(
            (total, course) => total + course.lessons.length, 0
        );

        const percentage = allLessons
            ? Math.round((completed.length / allLessons) * 100)
            : 0;

        $("#learningProgressBar").style.width = `${percentage}%`;
        $("#learningProgressText").textContent =
            `${percentage}% completed (${completed.length}/${allLessons} lessons)`;

        $("#courseList").innerHTML = HirgalData.courses.map(course => {
            const courseCompleted = course.lessons.filter(
                lesson => completed.includes(lesson.id)
            ).length;

            const coursePercentage = Math.round(
                (courseCompleted / course.lessons.length) * 100
            );

            return `
                <article class="course-card">
                    <span class="category-tag">${escapeHTML(course.category)}</span>
                    <h3>${escapeHTML(course.title)}</h3>
                    <p>${escapeHTML(course.description)}</p>
                    <p>Level: ${escapeHTML(course.difficulty)}</p>
                    <p>${course.lessons.length} lessons</p>
                    <p>${coursePercentage}% completed</p>

                    <button class="signup-btn"
                        data-open-course="${escapeHTML(course.id)}">
                        ${coursePercentage === 100 ? "Review Course" : "Open Course"}
                    </button>
                </article>
            `;
        }).join("");
    }

    $("#courseList").addEventListener("click", event => {
        const button = event.target.closest("[data-open-course]");
        if (!button) return;

        activeCourseId = button.dataset.openCourse;
        renderLessons(activeCourseId);

        $("#lessonArea").classList.remove("hidden");
        $("#lessonArea").scrollIntoView({ behavior: "smooth" });
    });

    function renderLessons(courseId) {
        const course = HirgalData.courses.find(
            item => item.id === courseId
        );

        if (!course) return;

        const completed = getCompletedLessons();

        $("#lessonArea").innerHTML = `
            <h3>${escapeHTML(course.title)}</h3>
            <p>${escapeHTML(course.description)}</p>

            ${course.lessons.map((lesson, index) => `
                <article class="lesson-item">
                    <label>
                        <input type="checkbox"
                            data-complete-lesson="${escapeHTML(lesson.id)}"
                            ${completed.includes(lesson.id) ? "checked" : ""}>

                        <strong>
                            Lesson ${index + 1}: ${escapeHTML(lesson.title)}
                        </strong>
                    </label>

                    <p>${escapeHTML(lesson.content)}</p>
                </article>
            `).join("")}
        `;
    }

    $("#lessonArea").addEventListener("change", event => {
        const checkbox = event.target.closest("[data-complete-lesson]");
        if (!checkbox) return;

        saveCompletedLesson(
            checkbox.dataset.completeLesson,
            checkbox.checked
        );

        addActivity(
            checkbox.checked
                ? "Completed a BizPath lesson."
                : "Updated BizPath lesson progress."
        );
    });

    /* =====================================
       PROFILE
    ===================================== */

    function renderProfile() {
        const user = getUser();
        if (!user) return;

        $("#profileName").value = user.name;
        $("#profileEmail").value = user.email;
    }

    $("#profileForm").addEventListener("submit", event => {
        event.preventDefault();

        const name = $("#profileName").value.trim();
        const email = $("#profileEmail").value.trim().toLowerCase();

        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return showMessage(
                "#profileMessage",
                "Please enter a valid name and email."
            );
        }

        const currentUser = getUser();
        const users = HirgalStorage.getUsers();

        const emailExists = users.some(user =>
            user.email === email && user.id !== currentUser.id
        );

        if (emailExists) {
            return showMessage(
                "#profileMessage",
                "That email address is already used by another account."
            );
        }

        const updatedUsers = users.map(user =>
            user.id === currentUser.id
                ? { ...user, name, email }
                : user
        );

        if (!HirgalStorage.saveUsers(updatedUsers)) {
            return showMessage(
                "#profileMessage",
                "Could not save your profile."
            );
        }

        HirgalStorage.setCurrentUser({
            id: currentUser.id,
            name,
            email
        });

        updateUserInformation();
        addActivity("Updated account profile.");

        showMessage(
            "#profileMessage",
            "Profile updated successfully!",
            true
        );
    });

    /* =====================================
       LANGUAGE BUTTON
    ===================================== */

    $("#languageBtn")?.addEventListener("click", () => {
        const button = $("#languageBtn");
        button.textContent =
            button.textContent === "SO" ? "EN" : "SO";

        alert("Language switching is a visual demo only. Full Somali translation has not been added yet.");
    });

    /* =====================================
       INITIAL APPLICATION STARTUP
    ===================================== */

    const currentUser = getUser();

    if (currentUser) {
        showDashboard();
    } else {
        showPublicPage();
    }

    console.log("Hirgal application initialized successfully.");
});
