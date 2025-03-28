/**
 * Fills the edit modal with task details.
 * @param {Object} task - The task object.
 */
function fillEditModal(task) {
  setTaskFields(task);
  setAssigneeBadges(task);
  setSubtasksList(task);
  loadContacts(task.users || []);
}

/**
 * Sets the task fields in the edit modal.
 * @param {Object} task - The task object.
 */
function setTaskFields(task) {
  document.getElementById('editTaskTitle').value = task.title || "";
  document.getElementById('editTaskDescription').value = task.description || "";
  document.getElementById('editDueDate').value = task.dueDate || "";
  const prio = extractPriority(task.priority);
  setEditPriority(prio);
  if (task.category === 'Technical task') {
    document.getElementById('editTaskCategory').value = 'technical';
  } else if (task.category === 'User Story') {
    document.getElementById('editTaskCategory').value = 'userstory';
  } else {
    document.getElementById('editTaskCategory').value = '';
  }
}

/**
 * Sets the assignee badges in the edit modal.
 * @param {Object} task - The task object.
 */
function setAssigneeBadges(task) {
  const badges = document.getElementById('assigneeBadges');
  if (badges && task.users && task.users.length > 0) {
    badges.innerHTML = task.users.map(user => {
      let colorValue = user.color || "default";
      if (colorValue.startsWith('#')) {
        switch (colorValue.toUpperCase()) {
          case '#F57C00': colorValue = 'orange'; break;
          case '#E74C3C': colorValue = 'red'; break;
          case '#5C6BC0': colorValue = 'blue'; break;
          case '#4CAF50': colorValue = 'green'; break;
          case '#8E44AD': colorValue = 'purple'; break;
          case '#EE00FF': colorValue = 'pink'; break;
          default: colorValue = "default"; break;
        }
      }
      const badgeClass = getBadgeClassFromAnyColor(colorValue);
      const initials = user.initials || getInitials(user.name);
      return `
        <div class="assignee-badge ${badgeClass}"
             data-contact-color="${colorValue}"
             data-contact-name="${user.name}">
          ${initials}
        </div>`;
    }).join("");
  } else {
    badges.innerHTML = "";
  }
}

/**
 * Populates the subtasks list in the edit modal.
 * @param {Object} task - The task object.
 */
function setSubtasksList(task) {
  const list = document.getElementById('editSubtasksList');
  list.innerHTML = "";
  if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length) {
    task.subtasks.forEach(st => {
      const stDiv = document.createElement("div");
      stDiv.className = "subtask-item";
      stDiv.innerHTML = `
        <span>• ${st.text}</span>
        <div class="subtask-actions">
          <img src="../img/pen.png" alt="Edit" class="subtask-edit-edit">
          <img src="../img/trash.png" alt="Delete" class="subtask-delete-edit">
        </div>`;
      list.appendChild(stDiv);
    });
  }
}

/**
 * Extracts the priority level from a given path.
 * @param {string} priorityPath - The priority image path.
 * @returns {string} - The priority level ('urgent', 'low', or 'medium').
 */
function extractPriority(priorityPath) {
  if (!priorityPath) return 'medium';
  const lowerPath = priorityPath.toLowerCase();
  if (lowerPath.includes('urgent')) return 'urgent';
  if (lowerPath.includes('low')) return 'low';
  return 'medium';
}

/**
 * Sets the active priority button based on the given priority.
 * @param {string} priority - The priority level.
 */
function setEditPriority(priority) {
  const urgentBtn = document.querySelector('.edit-priority-urgent');
  const mediumBtn = document.querySelector('.edit-priority-medium');
  const lowBtn = document.querySelector('.edit-priority-low');
  urgentBtn.classList.remove('active');
  mediumBtn.classList.remove('active');
  lowBtn.classList.remove('active');
  switch (priority) {
    case 'urgent':
      urgentBtn.classList.add('active');
      break;
    case 'low':
      lowBtn.classList.add('active');
      break;
    default:
      mediumBtn.classList.add('active');
      break;
  }
}

/**
 * Saves the edited task to Firebase.
 */
async function saveEditedTaskToFirebase() {
  if (!currentTask) return;
  updateTaskFromInputs();
  await updateTaskInFirebase(currentTask);
  closeEditModal();
  location.reload();
}

/**
 * Updates the current task object with values from the edit modal inputs.
 */
function updateTaskFromInputs() {
  currentTask.title = document.getElementById('editTaskTitle').value.trim() || currentTask.title;
  currentTask.description = document.getElementById('editTaskDescription').value.trim() || currentTask.description;
  currentTask.dueDate = document.getElementById('editDueDate').value.trim() || currentTask.dueDate;
  const prio = getSelectedPriority();
  currentTask.priority = getPriorityPath(prio);
  const cat = document.getElementById('editTaskCategory').value;
  currentTask.category = (cat === 'technical') ? 'Technical task' : 'User Story';
  const newSubs = readSubtasksFromEditModal();
  if (newSubs.length) currentTask.subtasks = newSubs;
  const newAssignees = readAssigneesFromBadges();
  if (newAssignees.length) {
    currentTask.users = newAssignees;
  }
}

/**
 * Updates the task in Firebase.
 * @param {Object} task - The task object.
 */
async function updateTaskInFirebase(task) {
  if (!task || !task.firebaseKey) return;
  const url = `https://join-360-1d879-default-rtdb.europe-west1.firebasedatabase.app/taskData/${task.firebaseKey}.json`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error(`Update fehlgeschlagen: ${response.statusText}`);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Closes the edit modal.
 * @param {Event} [event] - The event object.
 */
function closeEditModal(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('editTaskModal');
  if (modal) modal.style.display = 'none';
}

/**
 * Returns the badge class based on a given color.
 * @param {string} colorValue - The color value or name.
 * @returns {string} - The corresponding badge class.
 */
function getBadgeClassFromAnyColor(colorValue) {
  if (!colorValue) {
    colorValue = "default";
  }
  if (colorValue.startsWith('profile-badge-')) {
    return colorValue;
  }
  const lowerValue = colorValue.trim().toLowerCase();
  switch (lowerValue) {
    case 'red':    return 'profile-badge-floating-red';
    case 'orange': return 'profile-badge-floating-orange';
    case 'blue':   return 'profile-badge-floating-blue';
    case 'purple': return 'profile-badge-floating-purple';
    case 'green':  return 'profile-badge-floating-green';
    case 'pink':   return 'profile-badge-floating-pink';
    default:       return 'profile-badge-floating-default';
  }
}

/**
 * Loads contacts from Firebase and populates the assignee dropdown.
 * @param {Array} [assignedUsers=[]] - Array of already assigned users.
 */
async function loadContacts(assignedUsers = []) {
  try {
    const response = await fetch('https://join-360-1d879-default-rtdb.europe-west1.firebasedatabase.app/contacts.json');
    const contacts = await response.json();
    console.log('Contacts loaded:', contacts);
    populateAssigneeDropdown(contacts, assignedUsers);
  } catch (error) {
    console.error('Error fetching contacts:', error);
  }
}

/**
 * Populates the assignee dropdown with contacts.
 * @param {Object} contacts - The contacts object from Firebase.
 * @param {Array} assignedUsers - Array of already assigned users.
 */
function populateAssigneeDropdown(contacts, assignedUsers) {
  const dropdownSelected = document.getElementById('assigneeDropdownSelected');
  const dropdownList = document.getElementById('assigneeDropdownList');
  const badgesContainer = document.getElementById('assigneeBadges');
  dropdownList.innerHTML = "";
  const assignedUserNames = new Set(
    assignedUsers.map(u => u.name.trim().toLowerCase())
  );
  console.log("Assigned user names:", Array.from(assignedUserNames));
  const selectedContacts = new Set();
  Object.entries(contacts).forEach(([id, contact]) => {
    const item = createDropdownItem(id, contact, selectedContacts, badgesContainer);
    dropdownList.appendChild(item);
    const contactName = contact.name.trim().toLowerCase();
    console.log("Checking contact:", contactName);
    if (assignedUserNames.has(contactName)) {
      selectedContacts.add(id);
      item.classList.add('selected');
      const checkbox = item.querySelector('.custom-checkbox');
      checkbox.src = "../img/checkboxchecked.png";
      checkbox.style.filter = "brightness(0) invert(1)";
      createContactBadge(contact, id, badgesContainer, selectedContacts);
    }
  });
  dropdownSelected.addEventListener('click', event => {
    event.stopPropagation();
    dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', event => {
    if (!dropdownList.contains(event.target) && !dropdownSelected.contains(event.target)) {
      dropdownList.style.display = 'none';
    }
  });
}

/**
 * Creates a dropdown item for a contact.
 * @param {string} id - The contact ID.
 * @param {Object} contact - The contact object.
 * @param {Set} selectedContacts - Set of selected contact IDs.
 * @param {HTMLElement} badgesContainer - Container element for badges.
 * @returns {HTMLElement} - The dropdown item element.
 */
function createDropdownItem(id, contact, selectedContacts, badgesContainer) {
  const initials = getInitials(contact.name);
  const colorValue = contact.color || "default";
  let simpleColor = colorValue;
  if (colorValue.startsWith('#')) {
    switch (colorValue.toUpperCase()) {
      case '#F57C00': simpleColor = 'orange'; break;
      case '#E74C3C': simpleColor = 'red'; break;
      case '#5C6BC0': simpleColor = 'blue'; break;
      case '#4CAF50': simpleColor = 'green'; break;
      case '#8E44AD': simpleColor = 'purple'; break;
      case '#EE00FF': simpleColor = 'pink'; break;
      default: simpleColor = 'default'; break;
    }
  }
  const item = document.createElement('div');
  item.classList.add('dropdown-item');
  item.innerHTML = `
    <div class="contact-info">
      <span class="initials-circle" style="background-color: ${colorValue};">
        ${initials}
      </span>
      <span class="contact-name">${contact.name}</span>
    </div>
    <img src="../img/chekbox.png" alt="checkbox" class="custom-checkbox">`;
  item.addEventListener('click', event => {
    event.stopPropagation();
    handleDropdownSelection(item, id, contact, selectedContacts, badgesContainer);
  });
  return item;
}

/**
 * Handles the selection of a dropdown item.
 * @param {HTMLElement} item - The dropdown item element.
 * @param {string} id - The contact ID.
 * @param {Object} contact - The contact object.
 * @param {Set} selectedContacts - Set of selected contact IDs.
 * @param {HTMLElement} badgesContainer - Container element for badges.
 */
function handleDropdownSelection(item, id, contact, selectedContacts, badgesContainer) {
  const checkbox = item.querySelector('.custom-checkbox');
  if (!selectedContacts.has(id)) {
    selectedContacts.add(id);
    item.classList.add('selected');
    checkbox.src = "../img/checkboxchecked.png";
    checkbox.style.filter = "brightness(0) invert(1)";
    createContactBadge(contact, id, badgesContainer, selectedContacts);
  } else {
    selectedContacts.delete(id);
    item.classList.remove('selected');
    checkbox.src = "../img/chekbox.png";
    checkbox.style.filter = "";
    const badge = badgesContainer.querySelector(`[data-contact-id="${id}"]`);
    if (badge) badge.remove();
  }
}

/**
 * Creates a contact badge and appends it to the container.
 * @param {Object} contact - The contact object.
 * @param {string} id - The contact ID.
 * @param {HTMLElement} container - The container element for the badge.
 * @param {Set} selectedContacts - Set of selected contact IDs.
 */
function createContactBadge(contact, id, container, selectedContacts) {
  const colorValue = contact.color || "default";
  let simpleColor = colorValue;
  if (colorValue.startsWith('#')) {
    switch (colorValue.toUpperCase()) {
      case '#F57C00': simpleColor = 'orange'; break;
      case '#E74C3C': simpleColor = 'red'; break;
      case '#5C6BC0': simpleColor = 'blue'; break;
      case '#4CAF50': simpleColor = 'green'; break;
      case '#8E44AD': simpleColor = 'purple'; break;
      case '#EE00FF': simpleColor = 'pink'; break;
      default: simpleColor = 'default'; break;
    }
  }
  const badgeClass = getBadgeClassFromAnyColor(simpleColor);
  if (container.querySelector(`[data-contact-id="${id}"]`)) return;
  const badge = document.createElement('div');
  badge.className = `assignee-badge ${badgeClass}`;
  badge.dataset.contactId = id;
  badge.dataset.contactName = contact.name;
  badge.dataset.contactColor = simpleColor;
  badge.textContent = getInitials(contact.name);
  badge.addEventListener('click', () => {
    badge.remove();
    selectedContacts.delete(id);
  });
  container.appendChild(badge);
}

/**
 * Reads the assignees from the badges.
 * @returns {Array} - Array of user objects with name and color.
 */
function readAssigneesFromBadges() {
  const badges = document.querySelectorAll('#assigneeBadges .assignee-badge');
  const users = [];
  badges.forEach(badge => {
    users.push({
      name: badge.dataset.contactName || badge.textContent.trim(),
      color: badge.dataset.contactColor || "default"
    });
  });
  return users;
}

/**
 * Returns the currently selected priority.
 * @returns {string} - The selected priority.
 */
function getSelectedPriority() {
  if (document.querySelector('.edit-priority-urgent.active')) return 'urgent';
  if (document.querySelector('.edit-priority-medium.active')) return 'medium';
  if (document.querySelector('.edit-priority-low.active')) return 'low';
  return 'medium';
}

/**
 * Returns the priority image path based on the given priority.
 * @param {string} priority - The priority level.
 * @returns {string} - The image path for the priority.
 */
function getPriorityPath(priority) {
  switch (priority) {
    case 'urgent': return '../../img/priority-img/urgent.png';
    case 'medium': return '../../img/priority-img/medium.png';
    case 'low':    return '../../img/priority-img/low.png';
    default:       return '../../img/priority-img/medium.png';
  }
}

/**
 * Reads subtasks from the edit modal.
 * @returns {Array} - Array of subtasks.
 */
function readSubtasksFromEditModal() {
  const subtaskItems = document.querySelectorAll('#editSubtasksList .subtask-item');
  const subtasks = [];
  subtaskItems.forEach(item => {
    const span = item.querySelector('span');
    if (span) {
      subtasks.push({
        text: span.innerText.replace('• ', '').trim(),
        completed: false
      });
    }
  });
  return subtasks;
}

/**
 * Opens the edit task modal from an overlay.
 * @param {Event} event - The event object.
 */
function editTaskFromOverlay(event) {
  event.stopPropagation();
  if (!currentTask) return;
  fillEditModal(currentTask);
  document.getElementById('toggleModalFloating').style.display = 'none';
  const modal = document.getElementById('editTaskModal');
  if (modal) modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmEditBtn')?.addEventListener('click', saveEditedTaskToFirebase);
  const subtaskInput = document.querySelector('.subtask-input');
  const subtaskCheck = document.querySelector('.subtask-edit-check');
  const subtasksList = document.getElementById('editSubtasksList');
  subtaskCheck?.addEventListener('click', () => {
    const text = subtaskInput.value.trim();
    if (text !== '') {
      const newSubtask = document.createElement('div');
      newSubtask.className = 'subtask-item';
      newSubtask.innerHTML = `
        <span>• ${text}</span>
        <div class="subtask-actions">
          <img src="../img/pen.png" alt="Edit" class="subtask-edit-edit">
          <img src="../img/trash.png" alt="Delete" class="subtask-delete-edit">
        </div>`;
      subtasksList.appendChild(newSubtask);
      subtaskInput.value = '';
    }
  });
  subtasksList?.addEventListener('click', e => {
    if (e.target?.matches('img[alt="Delete"]')) {
      e.target.closest('.subtask-item')?.remove();
    }
  });
});
