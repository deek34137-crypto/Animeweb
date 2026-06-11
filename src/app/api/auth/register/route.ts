import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, displayName } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    // Check if email or username is already taken
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: String(email).toLowerCase() },
          { username: String(username).toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === String(email).toLowerCase()) {
        return NextResponse.json({ error: 'Email is already registered.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create the user
    const newUser = await db.user.create({
      data: {
        username: String(username).toLowerCase(),
        email: String(email).toLowerCase(),
        password: hashedPassword,
        displayName: displayName || username,
      },
    });

    return NextResponse.json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
