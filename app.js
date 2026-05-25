// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDQOR7tuWvX_ysKUOQcMnAbtVLLMIQzHEI",
    authDomain: "shop-ff6e6.firebaseapp.com",
    projectId: "shop-ff6e6",
    storageBucket: "shop-ff6e6.firebasestorage.app",
    messagingSenderId: "282249658606",
    appId: "1:282249658606:web:9bd31f378935795f52b3ff",
    measurementId: "G-Z7SXY9D2NQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Get Current User ID
function getCurrentUserId() {
    if (auth.currentUser) {
        return auth.currentUser.uid;
    }
    // For dev mode
    if (localStorage.getItem("loginType") === "dev") {
        return "dev_user";
    }
    return null;
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

// Toggle Profile Dropdown
function toggleProfile() {
    document.getElementById("profileDropdown").classList.toggle("show");
}

// Close dropdown when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.profile') &&!event.target.matches('.profile *')) {
        let dropdown = document.getElementById("profileDropdown");
        if (dropdown && dropdown.classList.contains("show")) {
            dropdown.classList.remove("show");
        }
    }

    // Close sidebar on mobile when clicking outside
    if (!event.target.matches('.menu-btn') &&!event.target.closest('.sidebar')) {
        let sidebar = document.getElementById("sidebar");
        if (sidebar && sidebar.classList.contains("show") && window.innerWidth <= 768) {
            sidebar.classList.remove("show");
        }
    }
}

// Check Auth
function checkAuth() {
    let user = localStorage.getItem("shopUser");
    let registered = localStorage.getItem("shopRegistered");

    if(!user || registered!== "true"){
        location.href = "login.html";
        return false;
    }
    return true;
}

// Load User Info with Initials - UPDATED
function loadUserInfo() {
    let shop = JSON.parse(localStorage.getItem("shopDetails"));
    if(shop){
        let shopNameEl = document.getElementById("shopName");
        if(shopNameEl) {
            shopNameEl.innerText = shop.shopName;
        }

        // Convert Owner Name to Initials (RS for Rahul Sharma)
        let ownerName = shop.ownerName || "User";
        let initials = ownerName
           .split(' ')
           .filter(word => word.length > 0)
           .map(word => word.charAt(0).toUpperCase())
           .join('');

        let userEmailEl = document.getElementById("userEmail");
        if(userEmailEl) {
            userEmailEl.innerText = initials;
        }
    }
}

// Update Due Badge
async function updateDueBadge() {
    let customers = await getCloudData("customers");
    let dueCustomers = customers.filter(c => (c.due || 0) > 0);
    let badge = document.getElementById("dueBadge");

    if(badge) {
        if(dueCustomers.length > 0) {
            badge.innerText = dueCustomers.length;
            badge.style.display = "inline";
        } else {
            badge.style.display = "none";
        }
    }
}

// Logout
function logout() {
    if(confirm("Are you sure you want to logout?")) {
        auth.signOut().then(() => {
            localStorage.clear();
            location.href = "login.html";
        }).catch(() => {
            // If Firebase logout fails, still clear localStorage
            localStorage.clear();
            location.href = "login.html";
        });
    }
}

// Open Edit Profile Modal
function openEditProfile() {
    let shop = JSON.parse(localStorage.getItem("shopDetails"));
    if(shop){
        document.getElementById("editShopName").value = shop.shopName || "";
        document.getElementById("editOwnerName").value = shop.ownerName || "";
        document.getElementById("editShopPhone").value = shop.shopPhone || "";
        document.getElementById("editShopAddress").value = shop.shopAddress || "";
        document.getElementById("editUpiId").value = shop.upiId || "";
    }
    document.getElementById("editProfileModal").style.display = "flex";
}

// Close Edit Profile Modal
function closeEditProfile() {
    document.getElementById("editProfileModal").style.display = "none";
}

// Save Shop Details
async function saveShopDetails() {
    let shopName = document.getElementById("editShopName").value.trim();
    let ownerName = document.getElementById("editOwnerName").value.trim();
    let shopPhone = document.getElementById("editShopPhone").value.trim();
    let shopAddress = document.getElementById("editShopAddress").value.trim();
    let upiId = document.getElementById("editUpiId").value.trim();

    if(!shopName ||!ownerName ||!shopPhone) {
        alert("Please fill Shop Name, Owner Name and Phone!");
        return;
    }

    if(shopPhone.length!== 10 || isNaN(shopPhone)) {
        alert("Please enter valid 10-digit phone number!");
        return;
    }

    let shopData = {
        shopName: shopName,
        ownerName: ownerName,
        shopPhone: shopPhone,
        shopAddress: shopAddress,
        upiId: upiId,
        registered: true
    };

    // Save to Firebase if not dev mode
    let userId = getCurrentUserId();
    if(userId && userId!== "dev_user") {
        try {
            await db.collection("users").doc(userId).update(shopData);
        } catch(err) {
            console.error("Firebase save error:", err);
        }
    }

    // Save to localStorage
    localStorage.setItem("shopDetails", JSON.stringify(shopData));

    alert("Shop details updated successfully!");
    closeEditProfile();
    loadUserInfo();
}

// Cloud Data Functions
async function getCloudData(key) {
    let userId = getCurrentUserId();

    // Dev mode - use localStorage
    if(userId === "dev_user") {
        return JSON.parse(localStorage.getItem(key) || "[]");
    }

    // Firebase mode
    if(!userId) return [];

    try {
        let doc = await db.collection("users").doc(userId).collection("data").doc(key).get();
        return doc.exists? doc.data().items : [];
    } catch(err) {
        console.error("Error getting cloud data:", err);
        return [];
    }
}

async function saveCloudData(key, data) {
    let userId = getCurrentUserId();

    // Dev mode - use localStorage
    if(userId === "dev_user") {
        localStorage.setItem(key, JSON.stringify(data));
        return;
    }

    // Firebase mode
    if(!userId) return;

    try {
        await db.collection("users").doc(userId).collection("data").doc(key).set({
            items: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(err) {
        console.error("Error saving cloud data:", err);
    }
}

// Get Today's Date (DD-MM-YYYY format)
function getTodayDate() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();
    return dd + '-' + mm + '-' + yyyy;
}

// Get Current Time (HH:MM:SS format)
function getCurrentTime() {
    let now = new Date();
    let hh = String(now.getHours()).padStart(2, '0');
    let mm = String(now.getMinutes()).padStart(2, '0');
    let ss = String(now.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
}

// Format Currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount || 0).toFixed(2);
}

// Generate Bill Number
async function generateBillNo() {
    let sales = await getCloudData("sales");
    let today = getTodayDate();
    let todaySales = sales.filter(s => s.date === today);
    let billNo = todaySales.length + 1;
    return String(billNo).padStart(4, '0');
}

// Search Function
function searchTable(tableId, searchInputId) {
    let input = document.getElementById(searchInputId);
    let filter = input.value.toUpperCase();
    let table = document.getElementById(tableId);
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td");
        let found = false;

        for (let j = 0; j < td.length; j++) {
            if (td[j]) {
                let txtValue = td[j].textContent || td[j].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
        }

        tr[i].style.display = found? "" : "none";
    }
}

// Export Table to CSV
function exportToCSV(tableId, filename) {
    let table = document.getElementById(tableId);
    let rows = table.querySelectorAll("tr");
    let csv = [];

    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");

        for (let j = 0; j < cols.length; j++) {
            let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " ");
            data = data.replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(","));
    }

    let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    let downloadLink = document.createElement("a");
    downloadLink.download = filename + "_" + getTodayDate() + ".csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Print Function
function printElement(elementId) {
    let printContents = document.getElementById(elementId).innerHTML;
    let originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    location.reload();
}

// Show Loading Spinner
function showLoading() {
    let loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingOverlay";
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    loadingDiv.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 20px; text-align: center;">
            <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
            <p style="margin: 0; font-weight: 600; color: #333;">Loading...</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

// Hide Loading Spinner
function hideLoading() {
    let loadingDiv = document.getElementById("loadingOverlay");
    if(loadingDiv) {
        loadingDiv.remove();
    }
}

// Add CSS for spinner animation
if (!document.getElementById('spinnerStyle')) {
    let style = document.createElement('style');
    style.id = 'spinnerStyle';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Auto-close sidebar on mobile after clicking link
    let sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if(window.innerWidth <= 768) {
                document.getElementById("sidebar").classList.remove("show");
            }
        });
    });

    // Auto-close modals when clicking outside
    window.onclick = function(event) {
        let modals = document.getElementsByClassName('modal');
        for (let i = 0; i < modals.length; i++) {
            if (event.target == modals[i]) {
                modals[i].style.display = "none";
            }
        }
    }
});

console.log("app.js loaded - Initials feature added - Version 2.0");