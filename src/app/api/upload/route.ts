import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // In a real application, you would upload the file to S3, Vercel Blob, etc.
    // For this demonstration, we'll create a fake URL or use a placeholder.
    // If it's a local demo, saving to public/uploads could work, but Vercel is read-only.
    // We'll simulate a successful upload and return a mock URL or a data URI if it's small enough,
    // but generating a placeholder URL is safer for now.

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert small images to base64 for demo purposes, 
    // or just return a static placeholder if too large.
    let imageUrl = '';
    if (buffer.length < 5 * 1024 * 1024) { // Under 5MB
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'image/jpeg';
      imageUrl = `data:${mimeType};base64,${base64}`;
    } else {
       imageUrl = 'https://placehold.co/600x400?text=Image+Too+Large+For+Demo';
    }

    return NextResponse.json({ 
        success: true, 
        url: imageUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
