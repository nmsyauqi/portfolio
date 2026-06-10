import './style.css';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, orderBy } from "firebase/firestore"; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import { db, auth, provider } from './firebase.js';

// --- KONFIGURASI ADMIN ---
// Ganti dengan email Google aslimu yang diizinkan untuk menambah/mengubah data
const ADMIN_EMAILS = [
  'nmsyauqi040@gmail.com', 
];

let currentUser = null;
let isAdmin = false;

// Memastikan sesi dihancurkan setiap kali halaman di-refresh (Tidak ada cache state)
setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// 1. Menyuntikkan Kerangka HTML Utama
document.querySelector('#app').innerHTML = `
  <header>
    <div class="title-group">
      <h1>Portofolio Nmsyauqi</h1>
      <p>Koleksi proyek terbaik</p>
    </div>
    <button id="btn-main-action" class="btn-primary">Login Admin</button>
  </header>

  <main>
    <section>
      <div id="portfolio-grid" class="portfolio-grid">
        <p style="color: var(--text-muted);">Memuat data...</p>
      </div>
    </section>
  </main>

  <!-- Modal Pop-up Tersembunyi -->
  <div id="crud-modal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="form-title">Tambah Proyek Baru</h2>
        <button id="btn-close-modal" class="close-btn">&times;</button>
      </div>
      
      <form id="portfolio-form">
        <div class="form-group">
          <label for="title">Judul Proyek</label>
          <input type="text" id="title" required placeholder="Misal: Website E-Commerce" />
        </div>
        <div class="form-group">
          <label for="description">Deskripsi Singkat</label>
          <textarea id="description" rows="3" required placeholder="Ceritakan sedikit tentang proyek ini..."></textarea>
        </div>
        <div class="form-group">
          <label for="imageUrl">URL Gambar (Opsional)</label>
          <input type="url" id="imageUrl" placeholder="Boleh dikosongkan..." />
        </div>
        <div class="form-group">
          <label for="projectUrl">URL Proyek / Redirect (Opsional)</label>
          <input type="url" id="projectUrl" placeholder="Misal: https://github.com/..." />
        </div>
        <div class="form-actions">
          <button type="button" id="cancel-btn" class="btn-secondary">Batal</button>
          <button type="submit" id="submit-btn" class="btn-primary">Simpan Proyek</button>
        </div>
      </form>
    </div>
  </div>
`;

// 2. Mengambil Elemen dari DOM & Variabel State
const portfolioForm = document.getElementById('portfolio-form');
const portfolioGrid = document.getElementById('portfolio-grid');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

const modal = document.getElementById('crud-modal');
const btnMainAction = document.getElementById('btn-main-action');
const btnCloseModal = document.getElementById('btn-close-modal');

let editingId = null;

// --- LOGIKA OTENTIKASI (LOGIN/LOGOUT) ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    isAdmin = ADMIN_EMAILS.includes(user.email);
  } else {
    currentUser = null;
    isAdmin = false;
  }
  
  // Perbarui tampilan berdasarkan status login
  if (isAdmin) {
    // Jika ADMIN: Tombol berubah jadi Tambah Proyek, dan tampilkan aksi di kartu
    btnMainAction.textContent = "+ Tambah Proyek";
    document.body.classList.add('is-admin');
  } else if (currentUser) {
    // Jika BUKAN ADMIN tapi login: Kasih tombol Logout
    btnMainAction.textContent = "Logout (" + user.email + ")";
    document.body.classList.remove('is-admin');
  } else {
    // Jika BELUM LOGIN sama sekali
    btnMainAction.textContent = "Login Admin";
    document.body.classList.remove('is-admin');
  }
});

btnMainAction.addEventListener('click', () => {
  if (isAdmin) {
    // Jika admin, tombol berfungsi untuk membuka modal tambah proyek
    openModal();
  } else if (currentUser) {
    // Jika login tapi BUKAN admin, tombol berfungsi untuk logout
    signOut(auth);
    alert("Berhasil logout.");
  } else {
    // Jika belum login, munculkan pop-up Google
    signInWithPopup(auth, provider).then((result) => {
      const email = result.user.email;
      if (!ADMIN_EMAILS.includes(email)) {
        alert("Login berhasil. Tapi maaf, " + email + " bukan merupakan Admin!");
      } else {
        alert("Selamat datang, Admin!");
      }
    }).catch((error) => {
      console.error("Error login:", error);
    });
  }
});

// --- LOGIKA UI MODAL ---
function openModal() {
  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
  setTimeout(() => {
    portfolioForm.reset();
    editingId = null;
    submitBtn.textContent = "Simpan Proyek";
    formTitle.textContent = "Tambah Proyek Baru";
  }, 300);
}

btnCloseModal.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// --- LOGIKA CREATE & UPDATE (Firestore) ---
portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Perlindungan ekstra di sisi klien
  if (!isAdmin) {
    alert("Hanya admin yang dapat menyimpan proyek!");
    return;
  }

  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const imageUrlInput = document.getElementById('imageUrl').value;
  const imageUrl = imageUrlInput ? imageUrlInput : "";
  const projectUrlInput = document.getElementById('projectUrl').value;
  const projectUrl = projectUrlInput ? projectUrlInput : "";

  try {
    if (editingId) {
      await updateDoc(doc(db, "projects", editingId), {
        title: title,
        description: description,
        imageUrl: imageUrl,
        projectUrl: projectUrl,
        updatedAt: new Date()
      });
      alert("Proyek berhasil diperbarui!");
    } else {
      await addDoc(collection(db, "projects"), {
        title: title,
        description: description,
        imageUrl: imageUrl,
        projectUrl: projectUrl,
        createdAt: new Date()
      });
      alert("Proyek berhasil ditambahkan!");
    }
    closeModal();
  } catch (error) {
    console.error("Error menyimpan dokumen: ", error);
    alert("Gagal menyimpan. Pastikan kamu adalah admin.");
  }
});

// --- LOGIKA READ, DELETE, & EDIT (Firestore) ---
// Membuat query untuk mengurutkan proyek berdasarkan waktu pembuatan (terbaru muncul paling atas)
const projectsQuery = query(collection(db, "projects"), orderBy("createdAt", "desc"));

onSnapshot(projectsQuery, (snapshot) => {
  portfolioGrid.innerHTML = '';

  if (snapshot.empty) {
    portfolioGrid.innerHTML = `
      <div class="empty-state">
        <h3>Belum ada proyek</h3>
        <p>Login sebagai admin untuk mulai memamerkan karyamu!</p>
      </div>
    `;
    return;
  }

  snapshot.forEach((docSnapshot) => {
    const project = docSnapshot.data();
    const projectId = docSnapshot.id;

    const card = document.createElement('div');
    card.className = project.projectUrl ? 'portfolio-card has-link' : 'portfolio-card';
    card.innerHTML = `
      <img src="${project.imageUrl || 'https://via.placeholder.com/300x200?text=Tanpa+Gambar'}" alt="${project.title}" class="card-img" onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Rusak'" />
      <div class="card-content">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="card-actions">
          <button class="btn-warning edit-btn" data-id="${projectId}" data-title="${project.title}" data-description="${project.description}" data-image="${project.imageUrl}" data-link="${project.projectUrl || ''}">Edit</button>
          <button class="btn-danger delete-btn" data-id="${projectId}">Hapus</button>
        </div>
      </div>
    `;
    
    if (project.projectUrl) {
      card.addEventListener('click', (e) => {
        if (!isAdmin && !e.target.closest('button')) {
          window.open(project.projectUrl, '_blank');
        }
      });
    }

    portfolioGrid.appendChild(card);
  });

  const editButtons = document.querySelectorAll('.edit-btn');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const target = e.target;
      editingId = target.getAttribute('data-id');
      document.getElementById('title').value = target.getAttribute('data-title');
      document.getElementById('description').value = target.getAttribute('data-description');
      document.getElementById('imageUrl').value = target.getAttribute('data-image');
      document.getElementById('projectUrl').value = target.getAttribute('data-link') || '';
      
      formTitle.textContent = "Edit Proyek";
      submitBtn.textContent = "Perbarui Proyek";
      openModal();
    });
  });

  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!isAdmin) return;
      const idToDelete = e.target.getAttribute('data-id');
      const confirmDelete = confirm("Apakah kamu yakin ingin menghapus proyek ini?");
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "projects", idToDelete));
        } catch (error) {
          console.error("Error menghapus dokumen: ", error);
        }
      }
    });
  });
});
