/* ===== To-Do List Manager: Complete CRUD Functionality ===== */
/* 
 * Manage To-Do items with full CRUD operations:
 * - CREATE: เพิ่มงานใหม่ผ่านฟอร์ม
 * - READ: โหลดจาก localStorage + หน้าจออัปเดตผ่าน render()
 * - UPDATE: ทำเสร็จ/ยกเลิกเสร็จ
 * - DELETE: ลบรายการ หรือ clear all completed
 * 
 * Features:
 * - กรองรายการ: ทั้งหมด/ค้างอยู่/เสร็จแล้ว
 * - bสำรองข้อมูล: localStorage persistent storage
 * - ป้องกัน XSS: escapeHtml() แปลงอักขระพิเศษ
 * - Fallback ID: crypto.randomUUID() with Date.now() backup
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ===== DOM Elements Selection ===== */
  /* ค้นหา elements ที่จำเป็น */
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const status = document.getElementById("todo-status");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const filterButtons = document.querySelectorAll(".filter-btn");

  /* ===== Guard Clause: Exit if Not On Project Page ===== */
  /* ถ้า element ใด element หนึ่งไม่พบ แปลว่าไม่อยู่ที่หน้า project
     ดังนั้นออกจากเพื่อไม่ให้เกิด error
  */
  if (
    !form ||
    !input ||
    !list ||
    !status ||
    !clearCompletedBtn ||
    filterButtons.length === 0
  ) {
    return;
  }

  /* ===== State Management ===== */
  /* ใช้ const สำหรับค่าคงที่ (storage key)
     ใช้ let สำหรับค่าที่เปลี่ยนแปลง (todos array, filter)
  */
  const STORAGE_KEY = "portfolio_todos"; // key สำหรับ localStorage
  let todos = loadTodos(); // โหลด todos จาก localStorage (array)
  let currentFilter = "all"; // ตัวกรองปัจจุบัน: "all", "active", "completed"

  render();

  /* ===== Event Listener 1: Form Submit (Add New Todo) ===== */
  /* เมื่อ submit -> ทำให้เกิด todo ใหม่ */
  form.addEventListener("submit", (event) => {
    event.preventDefault(); // หยุดการส่ง form ค่าเริ่มต้น

    const text = input.value.trim(); // ได้ข้อความจาก input + ตัดช่องว่าง
    if (!text) {
      // ถ้าว่างเปล่า ให้ออก
      return;
    }

    // สร้าง todo object ใหม่มีคุณสมบัติ: id, text, completed
    todos.push({
      id: createTodoId(), // สร้าง unique ID
      text, // ข้อความ
      completed: false, // สถานะเริ่มต้นยังไม่เสร็จ
    });

    input.value = ""; // ล้าง input field
    saveTodos(); // บันทึกไป localStorage
    render(); // อัปเดต UI
  });

  /* ===== Event Listener 2: List Click (Delete or Toggle Completed) ===== */
  /* ใช้ Event Delegation: ทีละ 1 listener ในพ่อแม่ (list)
     ไม่ต้อง attach listener ให้รายการนามแต่ละตัว
     ลดการใช้ memory + ช่วยให้ dynamic list ทำงานได้ดี
  */
  list.addEventListener("click", (event) => {
    const target = event.target; // ปุ่มหรือ checkbox ที่คลิก
    
    // ตรวจสอบประเภท: ต้องเป็น HTMLElement
    if (!(target instanceof HTMLElement)) {
      return;
    }

    // ค้นหา li ที่ใกล้ที่สุด (สำหรับ button/checkbox ข้างในลิ่กน์)
    const item = target.closest("li");
    if (!(item instanceof HTMLElement)) {
      return;
    }

    // ได้ todo id จาก data-id attribute
    const { id } = item.dataset;
    if (!id) {
      return;
    }

    // ===== ถ้าคลิก Delete Button =====
    if (target.matches("button[data-action='delete']")) {
      // กรองออก todo ที่มี id ตรงกัน
      todos = todos.filter((todo) => todo.id !== id);
      saveTodos(); // บันทึก
      render(); // อัปเดต UI
      return;
    }

    // ===== ถ้าคลิก Checkbox (Toggle Completed) =====
    if (target.matches("input[type='checkbox']")) {
      // Map ผ่าน todos: ถ้า id ตรงกัน เปลี่ยน completed
      todos = todos.map((todo) => {
        if (todo.id === id) {
          // สลับ completed: true/false
          return { ...todo, completed: !todo.completed };
        }
        return todo;
      });
      saveTodos(); // บันทึก
      render(); // อัปเดต UI
    }
  });

  /* ===== Event Listener 3: Clear Completed Button ===== */
  /* ลบทั้งหมดที่มี completed: true */
  clearCompletedBtn.addEventListener("click", () => {
    todos = todos.filter((todo) => !todo.completed); // เหลือแต่ที่ยังค้างอยู่
    saveTodos(); // บันทึก
    render(); // อัปเดต UI
  });

  /* ===== Event Listener 4: Filter Buttons ===== */
  /* ปุ่มตัวกรอง: "ทั้งหมด" / "ค้างอยู่" / "เสร็จแล้ว"
     forEach เพราะ querySelectorAll คืน NodeList ของหลายปุ่ม
  */
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter; // ได้ filter type จาก data-filter
      if (!filter) {
        return;
      }

      currentFilter = filter; // เปลี่ยนตัวกรองปัจจุบัน
      render(); // อัปเดต UI เพื่อแสดงรายการตามตัวกรอง
    });
  });

  /* ===== Function 1: loadTodos() ===== */
  /* โหลด todos array จาก localStorage ด้วยการป้องกัน error
     - ถ้าไม่มีข้อมูล: คืน array ว่าง
     - ถ้า JSON ผิด: catch error ม return array ว่าง
     - ตรวจสอบประเภท: ต้องเป็น array และมี id/text
  */
  function loadTodos() {
    const raw = localStorage.getItem(STORAGE_KEY); // ดึงจาก localStorage
    if (!raw) {
      // ถ้าไม่มีค่า (first time) คืน array ว่าง
      return [];
    }

    try {
      const parsed = JSON.parse(raw); // parse JSON string -> object
      
      // ตรวจสอบ: parsed ต้องเป็น array
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Filter & Map: 
      // - ลบรายการที่ invalid (id หรือ text ไม่ใช่ string)
      // - ทำให้ completed เป็น boolean แน่ชัด
      return parsed
        .filter(
          (todo) =>
            typeof todo?.id === "string" && typeof todo?.text === "string",
        )
        .map((todo) => ({
          id: todo.id,
          text: todo.text,
          completed: Boolean(todo.completed), // แปลงเป็น true/false
        }));
    } catch {
      // JSON parse error -> คืน array ว่าง
      return [];
    }
  }

  /* ===== Function 2: saveTodos() ===== */
  /* บันทึก todos array ไปยัง localStorage เป็น JSON string
     เรียกหลังจาก create/update/delete เพื่อ persist ข้อมูล
  */
  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  /* ===== Function 3: getFilteredTodos() ===== */
  /* คืน todos array ตามตัวกรองปัจจุบัน (currentFilter)
     - "active": แสดงเฉพาะที่ยังค้างอยู่ (completed: false)
     - "completed": แสดงเฉพาะที่เสร็จแล้ว (completed: true)
     - "all": แสดงทั้งหมด (default)
  */
  function getFilteredTodos() {
    if (currentFilter === "active") {
      return todos.filter((todo) => !todo.completed);
    }

    if (currentFilter === "completed") {
      return todos.filter((todo) => todo.completed);
    }

    return todos; // "all" หรือค่าอื่น -> แสดงทั้งหมด
  }

  /* ===== Function 4: render() ===== */
  /* ฟังก์ชันหลัก: อัปเดต UI ตามสถานะ todos และ currentFilter
     ขั้นตอน:
     1. ได้ todos ทีแสดง (ตามตัวกรอง)
     2. คำนวณสถิติ (เสร็จแล้ว, ค้างอยู่)
     3. อัปเดตปุ่มตัวกรอง (highlight active)
     4. อัปเดต "Clear Completed" button (disabled/enabled)
     5. ตั้ง status text ให้เห็นจำนวน
     6. สร้าง HTML สำหรับแต่ละ todo และใส่ใน list
  */
  function render() {
    const visibleTodos = getFilteredTodos(); // รายการตามตัวกรอง
    const completedCount = todos.filter((todo) => todo.completed).length; // จำนวนเสร็จ
    const activeCount = todos.length - completedCount; // จำนวนค้างอยู่

    /* ===== Step 1: Update Filter Buttons ===== */
    /* เพิ่ม "active" class ให้ปุ่มที่ตรง currentFilter */
    filterButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.filter === currentFilter,
      );
    });

    /* ===== Step 2: Update Clear Completed Button ===== */
    /* ปิดใช้ (disabled) ถ้าไม่มี todo ที่เสร็จแล้ว */
    clearCompletedBtn.disabled = completedCount === 0;

    /* ===== Step 3: Update Status Text ===== */
    /* แสดงข้อมูลจำนวน todo */
    if (todos.length === 0) {
      status.textContent = "ยังไม่มีงาน"; // ถ้าว่างเปล่า
    } else {
      status.textContent = `งานทั้งหมด ${todos.length} รายการ | ค้างอยู่ ${activeCount} | เสร็จแล้ว ${completedCount}`;
    }

    /* ===== Step 4: Early Return if No Visible Todos ===== */
    /* ถ้าตัวกรองไม่มีรายการ: ล้าง list และ exit */
    if (visibleTodos.length === 0) {
      list.innerHTML = "";
      if (todos.length > 0) {
        status.textContent += " | ไม่มีรายการในตัวกรองนี้";
      }
      return;
    }

    /* ===== Step 5: Generate HTML for Each Todo ===== */
    /* map visibleTodos -> HTML string
       - ใช้ escapeHtml() ป้องกัน XSS
       - เพิ่ม is-done class ถ้า completed
       - checked attribute สำหรับ checkbox
    */
    const html = visibleTodos
      .map((todo) => {
        const checked = todo.completed ? "checked" : ""; // ใส่ checked ถ้า done
        const doneClass = todo.completed ? " is-done" : ""; // ใส่ class ให้ styling
        return `
					<li class="todo-item${doneClass}" data-id="${escapeHtml(todo.id)}">
						<label>
							<input type="checkbox" ${checked}>
							<span>${escapeHtml(todo.text)}</span>
						</label>
						<button type="button" data-action="delete" aria-label="ลบงาน ${escapeHtml(todo.text)}">ลบ</button>
					</li>
				`;
      })
      .join(""); // join array -> single string

    /* ===== Step 6: Insert HTML into DOM ===== */
    list.innerHTML = html;
  }

    list.innerHTML = html;
  }

  /* ===== Function 5: escapeHtml() ===== */
  /* ป้องกัน XSS (Cross-Site Scripting) Attack โดยแปลง HTML special characters
     เป็น HTML Entities โดยที่ user input สามารถเห็นเป็นข้อความปกติได้
     ตัวอย่าง:
     - < -> &lt;
     - > -> &gt;
     - " -> &quot;
     - & -> &amp; (ต้องทำก่อนตัวอื่น)
  */
  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;") // & -> &amp; (ต้องทำก่อน)
      .replaceAll("<", "&lt;") // < -> &lt;
      .replaceAll(">", "&gt;") // > -> &gt;
      .replaceAll('"', "&quot;") // " -> &quot;
      .replaceAll("'", "&#039;"); // ' -> &#039;
  }

  /* ===== Function 6: createTodoId() ===== */
  /* สร้าง unique ID สำหรับแต่ละ todo
     - Priority 1: ใช้ crypto.randomUUID() (modern browsers)
     - Fallback: สร้าง ID จาก Date.now() + Math.random()
     ทำให้ compatible กับ browser เก่าและใหม่
  */
  function createTodoId() {
    // ตรวจสอบ crypto.randomUUID() มีอยู่หรือไม่
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return crypto.randomUUID(); // ใช้ built-in UUID generator
    }

    // Fallback สำหรับ browser ที่ไม่มี crypto.randomUUID()
    // สร้าง string จาก timestamp + random number
    return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
});
