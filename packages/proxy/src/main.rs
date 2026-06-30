use tokio::io::{AsyncReadExt, AsyncWriteExt};

enum AppStream {
    #[cfg(unix)]
    Unix(tokio::net::UnixStream),
    #[cfg(windows)]
    NamedPipe(tokio::net::windows::named_pipe::NamedPipeClient),
}

impl AppStream {
    async fn read_msg(&mut self) -> std::io::Result<Option<Vec<u8>>> {
        match self {
            #[cfg(unix)]
            AppStream::Unix(ref mut s) => read_msg(s).await,
            #[cfg(windows)]
            AppStream::NamedPipe(ref mut s) => read_msg(s).await,
        }
    }

    async fn write_msg(&mut self, msg: &[u8]) -> std::io::Result<()> {
        match self {
            #[cfg(unix)]
            AppStream::Unix(ref mut s) => write_msg(s, msg).await,
            #[cfg(windows)]
            AppStream::NamedPipe(ref mut s) => write_msg(s, msg).await,
        }
    }
}

async fn read_msg<R: AsyncReadExt + Unpin>(reader: &mut R) -> std::io::Result<Option<Vec<u8>>> {
    let mut len_bytes = [0u8; 4];
    match reader.read_exact(&mut len_bytes).await {
        Ok(_) => {}
        Err(ref e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let len = u32::from_ne_bytes(len_bytes) as usize;
    let mut buf = vec![0u8; len];
    reader.read_exact(&mut buf).await?;
    Ok(Some(buf))
}

async fn write_msg<W: AsyncWriteExt + Unpin>(writer: &mut W, msg: &[u8]) -> std::io::Result<()> {
    let len = msg.len() as u32;
    writer.write_all(&len.to_ne_bytes()).await?;
    writer.write_all(msg).await?;
    writer.flush().await?;
    Ok(())
}

#[cfg(unix)]
async fn connect_to_desktop() -> std::io::Result<AppStream> {
    use std::path::{Path, PathBuf};
    let home = std::env::var("HOME")
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e))?;
    let home_path = Path::new(&home);

    #[cfg(target_os = "macos")]
    let socket_path = home_path
        .join("Library")
        .join("Application Support")
        .join("secure-vault-manager")
        .join("secure-vault-manager.sock");

    #[cfg(not(target_os = "macos"))]
    let socket_path = {
        let xdg = std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| home_path.join(".local").join("share"));
        xdg.join("secure-vault-manager").join("secure-vault-manager.sock")
    };

    let stream = tokio::net::UnixStream::connect(socket_path).await?;
    Ok(AppStream::Unix(stream))
}

#[cfg(windows)]
async fn connect_to_desktop() -> std::io::Result<AppStream> {
    use tokio::net::windows::named_pipe::ClientOptions;
    let client = ClientOptions::new().open(r"\\.\pipe\secure-vault-manager-ipc")?;
    Ok(AppStream::NamedPipe(client))
}

#[tokio::main]
async fn main() {
    let mut stdin = tokio::io::stdin();
    let mut stdout = tokio::io::stdout();

    loop {
        let msg_bytes = match read_msg(&mut stdin).await {
            Ok(Some(bytes)) => bytes,
            Ok(None) => break, // EOF
            Err(e) => {
                eprintln!("Error reading from stdin: {}", e);
                break;
            }
        };

        // Try to connect to the Desktop App IPC
        let mut stream = match connect_to_desktop().await {
            Ok(s) => s,
            Err(_) => {
                let err_resp = serde_json::json!({
                    "status": "error",
                    "message": "Desktop application is not running."
                });
                let err_bytes = serde_json::to_vec(&err_resp).unwrap();
                let _ = write_msg(&mut stdout, &err_bytes).await;
                continue;
            }
        };

        // Forward message to Desktop App
        if let Err(e) = stream.write_msg(&msg_bytes).await {
            eprintln!("Error writing to desktop IPC: {}", e);
            let err_resp = serde_json::json!({
                "status": "error",
                "message": format!("Connection to desktop application lost: {}", e)
            });
            let err_bytes = serde_json::to_vec(&err_resp).unwrap();
            let _ = write_msg(&mut stdout, &err_bytes).await;
            continue;
        }

        // Read response from Desktop App
        match stream.read_msg().await {
            Ok(Some(resp_bytes)) => {
                if let Err(e) = write_msg(&mut stdout, &resp_bytes).await {
                    eprintln!("Error writing to stdout: {}", e);
                    break;
                }
            }
            Ok(None) => {
                let err_resp = serde_json::json!({
                    "status": "error",
                    "message": "Desktop application closed connection."
                });
                let err_bytes = serde_json::to_vec(&err_resp).unwrap();
                let _ = write_msg(&mut stdout, &err_bytes).await;
            }
            Err(e) => {
                eprintln!("Error reading from desktop IPC: {}", e);
                let err_resp = serde_json::json!({
                    "status": "error",
                    "message": format!("Error reading from desktop application: {}", e)
                });
                let err_bytes = serde_json::to_vec(&err_resp).unwrap();
                let _ = write_msg(&mut stdout, &err_bytes).await;
            }
        }
    }
}
