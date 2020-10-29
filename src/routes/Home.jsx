import React, { useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';
import Dropzone from 'react-dropzone';
import pdfImage from '../assets/pdf.png';
import tempPDF from '../assets/temp.pdf';
import videoImage from '../assets/youtube.png';
import mp3Image from '../assets/mp3.png';
import mp4Image from '../assets/mp4.png';
import gif from '../assets/ocr.gif'

function Home() {
    const [view, setView] = useState('choose');
    const [fileToUpload, setFile] = useState();
    const [video, setVideo] = useState();
    const [statusText, setStatusText] = useState();
    const [errorMessage, setErrorMessage] = useState();
    const [translatedContentStr, setTranslatedContentStr] = useState();
    const [translatedAudioUrl, setTranslatedAudioUrl] = useState();

    function resetState(errorMessage) {
        setView('choose');
        setFile(null);
        setStatusText(null);
        setErrorMessage(errorMessage);
    }

    async function getSignedUrl(forDownload, body) {
        setView('waiting');
        setStatusText('Uploading file...');

        let signedPostData;

        const options = {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let initialResponse = await fetch(`https://34ckmy75i8.execute-api.us-west-2.amazonaws.com/DevTest/get${forDownload ? 'download' : 'signed'}url`, options);

        let jsonResponse = await initialResponse.json();
        if (jsonResponse && jsonResponse.statusCode === 200) {
            signedPostData = jsonResponse.body;
        } else {
            return false;
        }

        return signedPostData;
    }

    async function uploadFile(event) {
        event.stopPropagation();

        const body = {
            fileName: fileToUpload.name,
            fileType: fileToUpload.type,
            bucket: 'devdiv-hackweek',
        };

        let presignedPostData = await getSignedUrl(false, body);
        if (presignedPostData)
        {
            let deserializedPostData = JSON.parse(presignedPostData);
            const url = deserializedPostData.signedURL.url;
            const formData = new FormData();
            Object.keys(deserializedPostData.signedURL.fields).forEach(key => {
                formData.append(key, deserializedPostData.signedURL.fields[key]);
            });
            let uniqueFileName = deserializedPostData.signedURL.fields['key'];
            if (uniqueFileName.indexOf('videos/') === 0) {
                uniqueFileName = uniqueFileName.substring(7);
            }
            let uniqueFileNameWithoutExt = uniqueFileName.substring(0, uniqueFileName.lastIndexOf('.'));
            formData.append("file", fileToUpload);
    
            const xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.send(formData);
            xhr.onload = async function() {
                if (this.status === 204) {
                    setStatusText('Transcribing file...');
                    try {
                        let fileStatus = await getFile(uniqueFileNameWithoutExt + '.mp3', 45000, 3);
                        if (fileStatus && fileStatus.statusCode === 204) {
                            await downloadFile(uniqueFileNameWithoutExt, 'mp3'); // audio file
                            await downloadFile(uniqueFileNameWithoutExt, 'txt'); // translated text file

                            setView('editVideo');
                        }
                        else {
                            resetState(`The files for ${uniqueFileName} are not yet available. Please check back later.`);
                        }
                    } catch (err) {
                        resetState('There was an error in the request. Please try again later.');
                    }
                }
                else {
                    resetState('There was an error uploading this file. Please try again.');
                }
            }
        } else {
            resetState(`Something went wrong with the upload. Are you uploading a video file?`);
        }
    }

    async function getFile(fileName, msDelay, tries) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        // let result;
        while (tries > 0) {
            try {
                await delay(msDelay);
                return await tryCheckForFile(fileName);
            } catch (err) {
                tries--;
            }
        }

        return false;
    }

    async function tryCheckForFile(fileName) {
        const body = {
            "fileName": fileName,
        };
        const options = {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let initialResponse = await fetch(`https://34ckmy75i8.execute-api.us-west-2.amazonaws.com/DevTest/checktranslationavailability`, options);
        let jsonResponse = await initialResponse.json();
        if (jsonResponse.statusCode === 404) {
            throw new Error('file not available');
        }
        return jsonResponse;
    }

    async function getSignedUrlForTranslatedFile(fileName, fileExt) {
        let downloadBody = {
            fileName: `${fileName}.${fileExt}`,
        };
        let signedResponse = await getSignedUrl(true, downloadBody);
        let jsonResponse = JSON.parse(signedResponse);

        return jsonResponse.signedURL;
    }

    async function downloadFile(fileName, fileExt) {
        let signedUrl = await getSignedUrlForTranslatedFile(fileName, fileExt);

        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', signedUrl);
            xhr.send();
            xhr.onload = () => {
                resolve(xhr.response);
            };
            xhr.onerror = () => {
                reject(xhr.Error)
            };
        });
    }

    const renderStepOne = () => {
        return (
            <>
                <Container>
                    <Jumbotron style={{
                        backgroundColor: 'transparent'
                    }}
                    >
                        <p>Start transcribing PDF textbooks or videos by uploading the PDF containing scanned textbook pages or entering the URL for the video.</p>
                        <p style={{ color: 'red' }}>{errorMessage}</p>
                    </Jumbotron>
                    <Container>
                        <Row>
                            <Col>
                                <Dropzone onDrop={acceptedFiles => {
                                    console.log(acceptedFiles[0]);
                                    setFile(acceptedFiles[0]);
                                }}
                                >
                                    {({ getRootProps, getInputProps, isDragActive }) => (
                                        <Card
                                            {...getRootProps()}
                                            border={isDragActive ? "primary" : ""}
                                            style={{
                                                width: '18rem',
                                                borderWidth: isDragActive ? '2px' : '1px'
                                            }}>
                                            {isDragActive && <Badge variant="primary">Drop here</Badge>}
                                            <Card.Body>
                                                <Card.Title>Upload a book PDF or video file</Card.Title>
                                            </Card.Body>
                                            <Card.Img
                                                variant="top"
                                                src={pdfImage}
                                                style={{
                                                    maxWidth: '100px',
                                                    alignSelf: 'center',
                                                    margin: '3em'
                                                }} />
                                            <Card.Body>
                                                Drag and drop file here or	
                                                <Button	
                                                    style={{	
                                                        paddingLeft: '0'	
                                                    }}	
                                                    variant="link"	
                                                >	
                                                    upload from your computer	
                                                </Button>	
                                                <input {...getInputProps()} />	
                                                {fileToUpload?.name || ''}
                                                <Container>
                                                    <Row >
                                                        <Col />
                                                        <Col>
                                                            <Button
                                                                disabled={!fileToUpload?.path}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    let translatedText = await downloadFile('SpeedOfSoundTestVideo_1603756163178', 'txt');
                                                                    let translatedAudioUrl = await getSignedUrlForTranslatedFile('SpeedOfSoundTestVideo_1603756163178', 'mp3');                                                                    

                                                                    setTranslatedContentStr(translatedText);
                                                                    setTranslatedAudioUrl(translatedAudioUrl);

                                                                    setView('editVideo');
                                                                }}
                                                                variant="success"
                                                            >
                                                                Next
                                                                    </Button>
                                                        </Col>
                                                        <Col />
                                                    </Row>
                                                </Container>
                                            </Card.Body>
                                        </Card>
                                    )}
                                </Dropzone>
                            </Col>
                            <Col style={{
                                textAlign: 'center',
                                alignSelf: 'center'
                            }}>
                                OR
                                    </Col>
                            <Col>
                                <Card style={{ width: '18rem' }}>
                                    <Card.Body>
                                        <Card.Title>Use an English video</Card.Title>
                                    </Card.Body>
                                    <Card.Img
                                        variant="top"
                                        src={videoImage}
                                        style={{
                                            maxWidth: '100px',
                                            alignSelf: 'center',
                                            margin: '3em'
                                        }} />
                                    <Card.Body>
                                        <Form.Group controlId="videoURL">
                                            <Form.Label>Enter video file URL</Form.Label>
                                            <Form.Control 
                                                type="url" 
                                                placeholder="https://www.youtube.com/embed/YpXXV10q_CY/21s" 
                                                pattern="https://.*" 
                                                size="30" 
                                                onChange={(event) => {setVideo(event.target.value);}}
                                                required 
                                            />
                                        </Form.Group>
                                        <Container>
                                            <Row >
                                                <Col />
                                                <Col>
                                                    <Button onClick={uploadFile} variant="success">Next</Button>
                                                </Col>
                                                <Col />
                                            </Row>
                                        </Container>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                </Container>
            </>
        );
    }

    const renderTextbookEditor = () => {

        return (<>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100vw',
                height: '100%'
            }}>
                <div style={{
                    flexGrow: '1'
                }}>
                    <iframe
                        title='PDF'
                        src={tempPDF}
                        width="100%"
                        height="100%" />
                </div>
                <div style={{
                    flexGrow: '1'
                }}>
                    <textarea
                        style={{
                            width: '100%',
                            height: '100%',
                            padding: '2em'
                        }}
                        defaultValue={`
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate, leo in pretium lobortis, enim tortor maximus odio, in finibus velit nunc et enim. Curabitur laoreet erat quis ultrices vehicula. Nunc enim purus, mattis sed posuere id, tempus quis ipsum. Quisque at elit in felis feugiat iaculis. Nulla vehicula nec orci eu feugiat. Proin vel ornare diam. Proin imperdiet iaculis purus, ut porttitor tortor finibus vitae. Ut euismod eleifend orci, sit amet hendrerit purus ultrices sed. Donec eu nunc ut est fermentum finibus. Ut quam ipsum, ornare eget mi id, fringilla mattis velit. Aliquam ac ligula risus. In tincidunt tellus in convallis consectetur. Ut tincidunt ante pulvinar erat condimentum elementum. Proin non vehicula ante.

Donec elementum vehicula leo, id elementum mauris blandit vel. Ut scelerisque ut dolor quis auctor. Donec ultrices, mi ac pellentesque tincidunt, libero mi molestie ante, vel interdum mauris neque vel nisi. Vestibulum at tincidunt ex. Aenean pharetra pretium posuere. Duis fermentum arcu magna, nec pulvinar enim blandit consectetur. Praesent cursus aliquet ligula ut congue. Nullam nec diam ac ligula malesuada condimentum. Proin aliquam varius eleifend.

Integer id ullamcorper urna, efficitur gravida nulla. Aenean vel dictum libero. Aenean non consequat sem. Nullam vestibulum metus urna, dignissim ornare mi condimentum vitae. Suspendisse in maximus dui. Vestibulum nulla leo, pharetra a ante vitae, sodales pellentesque dolor. Nullam lacinia tellus sodales eros bibendum ornare. Curabitur eu dolor aliquet, tincidunt ipsum at, eleifend velit. Fusce at ante vitae tortor fringilla mattis eu nec leo. Mauris a sem eu nunc varius convallis fermentum ac nunc. Fusce neque lacus, varius ut auctor a, pellentesque at lacus. Praesent eleifend condimentum turpis, ut imperdiet tortor auctor nec. 
                        `}
                    ></textarea>
                </div>
            </div>
        </>);
    }

    const renderVideoTranscriptEditor = () => {
        return (<>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100vw',
                height: '100%'
            }}>
                <div style={{
                    flexGrow: '1'
                }}>
                    <textarea 
                        readOnly
                        style={{
                            width: '100%',
                            height: '87%',
                            padding: '2em'
                        }}
                        value={translatedContentStr ?? `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate, leo in pretium lobortis, enim tortor maximus odio, in finibus velit nunc et enim. Curabitur laoreet erat quis ultrices vehicula. Nunc enim purus, mattis sed posuere id, tempus quis ipsum. Quisque at elit in felis feugiat iaculis. Nulla vehicula nec orci eu feugiat. Proin vel ornare diam. Proin imperdiet iaculis purus, ut porttitor tortor finibus vitae. Ut euismod eleifend orci, sit amet hendrerit purus ultrices sed. Donec eu nunc ut est fermentum finibus. Ut quam ipsum, ornare eget mi id, fringilla mattis velit. Aliquam ac ligula risus. In tincidunt tellus in convallis consectetur. Ut tincidunt ante pulvinar erat condimentum elementum. Proin non vehicula ante.

Donec elementum vehicula leo, id elementum mauris blandit vel. Ut scelerisque ut dolor quis auctor. Donec ultrices, mi ac pellentesque tincidunt, libero mi molestie ante, vel interdum mauris neque vel nisi. Vestibulum at tincidunt ex. Aenean pharetra pretium posuere. Duis fermentum arcu magna, nec pulvinar enim blandit consectetur. Praesent cursus aliquet ligula ut congue. Nullam nec diam ac ligula malesuada condimentum. Proin aliquam varius eleifend.

Integer id ullamcorper urna, efficitur gravida nulla. Aenean vel dictum libero. Aenean non consequat sem. Nullam vestibulum metus urna, dignissim ornare mi condimentum vitae. Suspendisse in maximus dui. Vestibulum nulla leo, pharetra a ante vitae, sodales pellentesque dolor. Nullam lacinia tellus sodales eros bibendum ornare. Curabitur eu dolor aliquet, tincidunt ipsum at, eleifend velit. Fusce at ante vitae tortor fringilla mattis eu nec leo. Mauris a sem eu nunc varius convallis fermentum ac nunc. Fusce neque lacus, varius ut auctor a, pellentesque at lacus. Praesent eleifend condimentum turpis, ut imperdiet tortor auctor nec. 
                        `}
                    ></textarea>
                    <div  
                        style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                        <Button variant="primary" onClick={(e) => {}}>Translate</Button>
                    </div>
                    
                </div>
                <div style={{
                    flexGrow: '1'
                }}>
                    <audio controls>
                        <source src={translatedAudioUrl} type="audio/mpeg" />
                    </audio>
                </div>
            </div>
        </>);
    }

    const renderEditorView = () => {
        return (
            <>
                <Container>
                    <Row>
                        <Col md={{ span: 12, offset: 0 }}>
                            <div style={{
                                backgroundColor: 'transparent',
                                padding: '1rem'
                            }}
                            >
                                <h1 style={{
                                    textAlign: 'center'
                                }}>
                                    {view === 'editTextbook' ? 'Edit textbook content' : 'Edit video transcript and translation'}
                                </h1>
                            </div>
                        </Col>
                    </Row>
                </Container>
                {view === 'editTextbook' ? renderTextbookEditor() : renderVideoTranscriptEditor()}
                <Container style={{
                    padding: '1em 0'
                }} >
                    <Row>
                        <Col></Col>
                        <Col>
                            <ButtonGroup aria-label="Basic example" style={{
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <Button variant="outline-primary" onClick={(e) => {
                                    setView('choose');
                                }}>Previous</Button>
                                <Button variant="outline-primary" onClick={(e) => {
                                    setView(view === 'editTextbook' ? 'downloadNarration' : 'downloadTranslation');
                                }}>Next</Button>
                            </ButtonGroup>
                        </Col>
                        <Col></Col>
                    </Row>
                </Container>
            </>
        );
    }

    const renderNarrationDownload = () => {
        return (
            <Container>
                <Row>
                    <Col md={{ span: 10, offset: 1 }}>
                        <Container>
                            <Row>
                                <Col>
                                    <Card>
                                        <Card.Body>
                                            <Container>
                                                <Row >
                                                    <Col />
                                                    <Col md='6' className='justify-content-center d-flex flex-column'>
                                                        <Card.Img
                                                            variant="top"
                                                            src={mp3Image}
                                                            style={{
                                                                maxWidth: '100px',
                                                                alignSelf: 'center',
                                                                margin: '3em'
                                                            }} />
                                                        <Button variant="link"> Download MP3 </Button>
                                                    </Col>
                                                    <Col />
                                                </Row>
                                            </Container>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col>
                                    <Card>
                                        <Card.Body>
                                            <Container>
                                                <Row >
                                                    <Col />
                                                    <Col md='6' className='justify-content-center d-flex flex-column'>
                                                        <Card.Img
                                                            variant="top"
                                                            src={mp4Image}
                                                            style={{
                                                                maxWidth: '100px',
                                                                alignSelf: 'center',
                                                                margin: '3em'
                                                            }} />
                                                        <Button variant="link"> Download MP4 </Button>
                                                    </Col>
                                                    <Col />
                                                </Row>
                                            </Container>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                </Row>
            </Container>
        );
    }

    const renderTranslatedVideoDownload = () => {
        return (
            <Container>
                <Row>
                    <Col md={{ span: 10, offset: 1 }}>
                        <Container>
                            <Row>
                                <Col>
                                    <Card>
                                        <Card.Body>
                                            <Container>
                                                <Row >
                                                    <div style={{
                                                        flexGrow: '1'
                                                    }}>
                                                        <iframe 
                                                            title='video'
                                                            width="100%"
                                                            height="100%" 
                                                            src={video || 'https://www.youtube.com/embed/YpXXV10q_CY/21s'}>
                                                        </iframe>
                                                    </div>
                                                    <Col />
                                                    <Col md='6' className='justify-content-center d-flex flex-column'>
                                                        <Card.Img
                                                            variant="top"
                                                            src={mp4Image}
                                                            style={{
                                                                maxWidth: '100px',
                                                                alignSelf: 'center',
                                                                margin: '3em'
                                                            }} />
                                                        <Button variant="link"> Download MP4 </Button>
                                                    </Col>
                                                    <Col />
                                                </Row>
                                            </Container>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Container>
                    </Col>
                </Row>
            </Container>
        );
    }

    const renderDowloadView = () => {
        return (
            <>
                <Container>
                    <Row>
                        <Col md={{ span: 12, offset: 0 }}>
                            <div style={{
                                backgroundColor: 'transparent',
                                padding: '1rem'
                            }}
                            >
                                <h1 style={{
                                    textAlign: 'center'
                                }}>
                                    {view === 'downloadNarration' ? 'Download full narration' : 'Review and download translated video'}
                                </h1>
                            </div>
                        </Col>
                    </Row>
                </Container>
                {view === 'downloadNarration' ? renderNarrationDownload() : renderTranslatedVideoDownload()}
                <Container style={{
                    padding: '1em 0',
                }} >
                    <Row>
                        <Col></Col>
                        <Col>
                            <ButtonGroup aria-label="Basic example" style={{
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <Button variant="outline-primary" onClick={(e) => {
                                    setView('downloadNarration' ? 'editTextbook' : 'editVideo');
                                }}>Previous</Button>
                                <Button variant="outline-primary" onClick={(e) => {
                                    setView('choose');
                                }}>Start Over</Button>
                            </ButtonGroup>
                        </Col>
                        <Col></Col>
                    </Row>
                </Container>
            </>
        );
    }

    const renderOCRLoading = () => {
        return (
            <>
                <Container>
                    <img
                        alt="Uploading and translating file..."
                        src={gif}
                        style={{
                            margin: 'auto',
                            display: 'block'
                        }} />
                    <div
                        style={{
                            textAlign: 'center'
                        }} >
                        <p>{statusText}</p>
                    </div>
                </Container>
            </>
        );
    }

    return (
        <>
            {view === 'choose' && renderStepOne()}
            {view === 'waiting' && renderOCRLoading()}
            {(view === 'editTextbook' || view === 'editVideo') && renderEditorView()}
            {(view === 'downloadNarration' || view === 'downloadTranslation') && renderDowloadView()}
        </>
    )
}

export default Home;
