import './style.css';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore"; 
import { db } from './firebase.js';

// 1. Menyuntikkan Kerangka HTML Utama
document.querySelector('#app').innerHTML = `
  <header>
    <div class="title-group">
      <h1>Portofolio Saya</h1>
      <p>Koleksi proyek nmsyauqi</p>
    </div>
    <button id="btn-open-modal" class="btn-primary">+ Tambah Proyek</button>
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
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');

let editingId = null; // Melacak apakah kita sedang edit atau tambah baru

// Fungsi untuk membuka modal
function openModal() {
  modal.classList.add('active');
}

// Fungsi untuk menutup modal dan mereset form
function closeModal() {
  modal.classList.remove('active');
  setTimeout(() => {
    portfolioForm.reset();
    editingId = null;
    submitBtn.textContent = "Simpan Proyek";
    formTitle.textContent = "Tambah Proyek Baru";
  }, 300); // Menunggu animasi selesai sebelum mereset teks
}

// Menghubungkan tombol dengan fungsi modal
btnOpenModal.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Menutup modal jika pengguna mengeklik area gelap di luar kotak modal
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// 3. Logika CREATE & UPDATE (Menambah & Memperbarui Data)
portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Mencegah halaman refresh

  // Ambil nilai dari inputan
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const imageUrlInput = document.getElementById('imageUrl').value;
  const imageUrl = imageUrlInput ? imageUrlInput : "";

  try {
    if (editingId) {
      // UPDATE: Memperbarui dokumen yang sudah ada
      await updateDoc(doc(db, "projects", editingId), {
        title: title,
        description: description,
        imageUrl: imageUrl,
        updatedAt: new Date()
      });
      alert("Proyek berhasil diperbarui!");
    } else {
      // CREATE: Menyimpan dokumen baru
      await addDoc(collection(db, "projects"), {
        title: title,
        description: description,
        imageUrl: imageUrl,
        createdAt: new Date()
      });
      alert("Proyek berhasil ditambahkan!");
    }
    
    // Tutup modal setelah berhasil
    closeModal();
  } catch (error) {
    console.error("Error menyimpan dokumen: ", error);
    alert("Gagal menyimpan proyek. Pastikan aturan Firebase mengizinkan write.");
  }
});

// 4. Logika READ, DELETE, & EDIT (Membaca, Menghapus, & Memuat form Edit)
onSnapshot(collection(db, "projects"), (snapshot) => {
  portfolioGrid.innerHTML = ''; // Bersihkan kontainer sebelum diisi ulang

  if (snapshot.empty) {
    portfolioGrid.innerHTML = `
      <div class="empty-state">
        <h3>Belum ada proyek</h3>
        <p>Yuk mulai pamerkan karyamu dengan mengeklik tombol '+ Tambah Proyek' di atas!</p>
      </div>
    `;
    return;
  }

  // Looping untuk setiap data proyek
  snapshot.forEach((docSnapshot) => {
    const project = docSnapshot.data();
    const projectId = docSnapshot.id;

    // Buat elemen HTML untuk kartu portofolio
    const card = document.createElement('div');
    card.className = 'portfolio-card';
    card.innerHTML = `
      <img src="${project.imageUrl || 'https://via.placeholder.com/300x200?text=Tanpa+Gambar'}" alt="${project.title}" class="card-img" onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Rusak'" />
      <div class="card-content">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="card-actions">
          <button class="btn-warning edit-btn" data-id="${projectId}" data-title="${project.title}" data-description="${project.description}" data-image="${project.imageUrl}">Edit</button>
          <button class="btn-danger delete-btn" data-id="${projectId}">Hapus</button>
        </div>
      </div>
    `;

    portfolioGrid.appendChild(card);
  });

  // Event listener untuk tombol EDIT
  const editButtons = document.querySelectorAll('.edit-btn');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target;
      
      // Isi form dengan data dari tombol
      editingId = target.getAttribute('data-id');
      document.getElementById('title').value = target.getAttribute('data-title');
      document.getElementById('description').value = target.getAttribute('data-description');
      document.getElementById('imageUrl').value = target.getAttribute('data-image');
      
      // Ubah tampilan UI form
      formTitle.textContent = "Edit Proyek";
      submitBtn.textContent = "Perbarui Proyek";
      
      // Buka modal
      openModal();
    });
  });

  // Event listener untuk tombol HAPUS
  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idToDelete = e.target.getAttribute('data-id');
      const confirmDelete = confirm("Apakah kamu yakin ingin menghapus proyek ini?");
      
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "projects", idToDelete));
        } catch (error) {
          console.error("Error menghapus dokumen: ", error);
          alert("Gagal menghapus proyek.");
        }
      }
    });
  });
});
