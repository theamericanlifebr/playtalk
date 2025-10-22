package com.playtalk.audio;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.TargetDataLine;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * MicrophoneCapture encapsulates the logic required to continuously capture
 * audio from the default system microphone using the Java Sound API.
 *
 * <p>The class starts recording as soon as it is instantiated and keeps
 * listening until {@link #shutdown()} is invoked.  The recorded samples can be
 * obtained through the {@link #getRecordedAudio()} method, enabling the
 * integration layer to decide how to consume or persist the captured voice
 * stream.</p>
 */
public final class MicrophoneCapture implements AutoCloseable {

    private static final Object LOCK = new Object();
    private static volatile MicrophoneCapture instance;

    /**
     * Default audio format tuned for voice capture on mobile devices.
     */
    private static final AudioFormat VOICE_FORMAT = new AudioFormat(
            AudioFormat.Encoding.PCM_SIGNED,
            16_000,    // sample rate (Hz)
            16,        // sample size in bits
            1,         // channels (mono)
            2,         // frame size (bytes per frame)
            16_000,    // frame rate
            true       // big endian for better interoperability on Android
    );

    private final TargetDataLine microphoneLine;
    private final ByteArrayOutputStream buffer;
    private final AtomicBoolean active;
    private final Thread captureThread;

    private MicrophoneCapture() {
        try {
            DataLine.Info info = new DataLine.Info(TargetDataLine.class, VOICE_FORMAT);
            microphoneLine = (TargetDataLine) AudioSystem.getLine(info);
            microphoneLine.open(VOICE_FORMAT);
            microphoneLine.start();
        } catch (LineUnavailableException e) {
            throw new IllegalStateException("Failed to initialize microphone capture", e);
        }

        buffer = new ByteArrayOutputStream();
        active = new AtomicBoolean(true);

        captureThread = new Thread(this::captureLoop, "microphone-capture-thread");
        captureThread.setDaemon(true);
        captureThread.start();
    }

    /**
     * Returns the singleton instance of the microphone capture utility. The
     * microphone stream is lazily initialized and kept alive across the
     * application lifecycle until {@link #shutdown()} is invoked.
     */
    public static MicrophoneCapture getInstance() {
        MicrophoneCapture current = instance;
        if (current != null && current.active.get()) {
            return current;
        }

        synchronized (LOCK) {
            current = instance;
            if (current == null || !current.active.get()) {
                current = new MicrophoneCapture();
                instance = current;
            }
            return current;
        }
    }

    private void captureLoop() {
        byte[] data = new byte[microphoneLine.getBufferSize() / 5];
        while (active.get()) {
            int bytesRead = microphoneLine.read(data, 0, data.length);
            if (bytesRead > 0) {
                buffer.write(data, 0, bytesRead);
            }
        }
    }

    /**
     * Exposes the live audio stream as an {@link AudioInputStream} so that the
     * mobile integration can hand the audio over to the game voice features.
     */
    public AudioInputStream getLiveStream() {
        return new AudioInputStream(
                microphoneLine,
                VOICE_FORMAT,
                AudioSystem.NOT_SPECIFIED
        );
    }

    /**
     * Returns a snapshot of the audio recorded so far. This can be used for
     * diagnostics or to send buffered segments when a live stream is not
     * available.
     */
    public synchronized byte[] getRecordedAudio() {
        return buffer.toByteArray();
    }

    /**
     * Stops the capture loop and releases the microphone resource. Even though
     * the microphone should remain active during gameplay sessions, the caller
     * must invoke this method when the application is shutting down to avoid
     * resource leaks.
     */
    public void shutdown() {
        if (active.compareAndSet(true, false)) {
            microphoneLine.stop();
            microphoneLine.close();
            try {
                captureThread.join();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            synchronized (LOCK) {
                if (instance == this) {
                    instance = null;
                }
            }
        }
    }

    @Override
    public void close() {
        shutdown();
    }
}
