import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function fixUser() {
    const oldId = "2erisxaCqbe1COIbjBBRUqyygW2";
    const newId = "VeVYHd5ql8e4WuAnSUoM9TegEgM2";

    const oldRef = db.collection("users").doc(oldId);
    const docSnap = await oldRef.get();

    if (!docSnap.exists) {
        console.log("Document introuvable");
        return;
    }

    // 1. On copie les données et les sous-collections vers le nouveau ID
    const data = docSnap.data();
    const newRef = db.collection("users").doc(newId);
    await newRef.set(data);

    // Copie des sous-collections (artists, feats)
    const subCols = await oldRef.listCollections();
    for (const subCol of subCols) {
        const subDocs = await subCol.get();
        for (const subDoc of subDocs.docs) {
            await newRef.collection(subCol.id).doc(subDoc.id).set(subDoc.data());
        }
    }

    // 2. On supprime l'ancien
    await oldRef.delete();
    console.log("C'est bon, tout a été migré avec le SDK Admin !");
}

fixUser();