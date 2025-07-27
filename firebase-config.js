// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBAOThNzmcXKMLm73OVW0_aaJ6dLOeu-03o",
    authDomain: "link-collection-a9265.firebaseapp.com",
    projectId: "link-collection-a9265",
    storageBucket: "link-collection-a9265.firebasestorage.app",
    messagingSenderId: "672460219802",
    appId: "1:672460219802:web:4e9b8074b6b3ea77d44623"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firestore 설정
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
        }
    }); 