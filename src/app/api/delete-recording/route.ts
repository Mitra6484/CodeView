import { NextResponse } from "next/server";
import { StreamVideoClient } from "@stream-io/video-react-sdk";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get("recordingId");
    const callId = searchParams.get("callId");

    if (!recordingId || !callId) {
      return NextResponse.json(
        { error: "Missing recordingId or callId" },
        { status: 400 }
      );
    }

    // Initialize Stream.io client
    const client = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      token: process.env.STREAM_API_SECRET!,
    });

    // Get the call instance
    const call = client.call("default", callId);

    // Delete the recording using Stream.io's REST API
    const response = await fetch(
      `https://api.stream-io-api.com/api/v1/calls/${callId}/recordings/${recordingId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.STREAM_API_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete recording from Stream.io");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
} 