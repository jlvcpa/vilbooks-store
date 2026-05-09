// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAgOsKAZWwExUzupxSNytsfOo9BOppF0ng",
    authDomain: "jlvcpa-quizzes.firebaseapp.com",
    projectId: "jlvcpa-quizzes",
    storageBucket: "jlvcpa-quizzes.appspot.com",
    messagingSenderId: "629158256557",
    appId: "1:629158256557:web:b3d1a424b32e28cd578b24"
};

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase Init Error:", e);
}

export { db };

export async function loginUser(idInput, passInput) {
    if (!db) return null;
    let authenticatedUser = null;
    
    const studentQuery = query(collection(db, 'students'), where('Idnumber', "==", idInput));
    const studentSnapshot = await getDocs(studentQuery);
    
    if (!studentSnapshot.empty) {
        studentSnapshot.forEach((doc) => {
            const data = doc.data();
            if (String(data.passWord) === passInput) authenticatedUser = { role: 'student', ...data };
        });
    }
    
    if (!authenticatedUser) {
        const teacherQuery = query(collection(db, 'teachers'), where('idNumber', "==", idInput));
        const teacherSnapshot = await getDocs(teacherQuery);
        if (!teacherSnapshot.empty) {
            teacherSnapshot.forEach((doc) => {
                const data = doc.data();
                if (String(data.passWord) === passInput) authenticatedUser = { role: 'teacher', ...data };
            });
        }
    }
    
    return authenticatedUser;
}
