import {
    AppShell,
    Container,
    Header,
    Space,
    Image,
    Text,
    Button, Breadcrumbs, Modal, Anchor, Group, Box, Loader, Divider
} from '@mantine/core';
import {Route, Routes} from "react-router-dom";
import {useState} from "react";
import {User} from "oidc-client-ts";
import Events from "./views/Events.tsx";
import Publish from "./views/Publish.tsx";
import UserContext from "./helpers/UserContext.ts";
import {useAuth} from "react-oidc-context";
import {IconLogin, IconLogout} from "@tabler/icons-react";
import MyPublishedDatasets from "./views/MyPublishedDatasets.tsx";
import GettingStarted from "./views/GettingStarted.tsx";
import API from "./views/API.tsx";
import Status from "./views/Status.tsx";

interface ALAUser {
    user: User,
    userId: string,
    isAdmin: boolean,
    isPublisher: boolean,
    roles: string[]
}


export default function App() {

    const [currentUser, setCurrentUser] = useState<ALAUser | null>(null);
    const auth = useAuth();

    const breadcrumbItems = [
        { title: 'Home', href: 'https://www.ala.org.au' },
        { title: 'Publish occurrence data', href: '#' }
    ].map((item, index) => (
        <Anchor href={item.href} key={index}>
            {item.title}
        </Anchor>
    ));

    if (auth.error) {
        return <div>Configuration error... {auth.error.message}</div>;
    }

    const myProfile = () => {
        window.location.href = import.meta.env.VITE_OIDC_AUTH_PROFILE
    };

    const signUp = () => {
        window.location.href = import.meta.env.VITE_SIGNUP_URL
    };

    const logout = () => {
        auth.removeUser();
        setCurrentUser(null);
        window.location.href = import.meta.env.VITE_OIDC_REDIRECT_URL
    };

    if (auth.isAuthenticated && auth.user && !currentUser) {
        // set the current user
        const user = auth.user;
        const roles = (user?.profile?.role || []) as string[];
        const userId = user?.profile?.userid as string || '';
        setCurrentUser({
            user: auth.user,
            userId: userId,
            isAdmin: roles.includes(import.meta.env.VITE_ROLE_ADMIN),
            isPublisher: roles.includes(import.meta.env.VITE_ROLE_PUBLISHER),
            roles: roles
        });
    }

    return (
        <UserContext.Provider value={currentUser}>
            <AppShell
                navbarOffsetBreakpoint="sm"
                asideOffsetBreakpoint="sm"
                style={{
                    backgroundColor: '#FFF',
                }}
                header={
                    <>
                        <Modal title="About" opened={auth.isLoading} onClose={() => console.log("auth checked")} >
                            <Group>
                                <Loader color="orange" />
                                <Text>Logging in...</Text>
                            </Group>
                        </Modal>
                        <Header height={{ base: 140, md: 140, padding: 0, margin: 0 }}>
                            <Container
                                style={{
                                    backgroundColor: '#212121',
                                    width: '100%',
                                    paddingTop: '20px',
                                    paddingLeft: 0,
                                    paddingRight: 0
                                }}
                                size="100%"
                            >
                                    <Image
                                        className={`logoImage`}
                                        radius="md"
                                        src={import.meta.env.VITE_LOGO_URL}
                                        alt="ALA logo"
                                        width={'335px'}
                                        fit="contain"
                                        style={{ marginTop: '10px', marginLeft: '30px' }}
                                    />

                                    <Image
                                        className={`logoImageSmall`}
                                        radius="md"
                                        src={import.meta.env.VITE_LOGO_URL}
                                        alt="ALA logo"
                                        width={'250px'}
                                        fit="contain"
                                        style={{ marginTop: '10px', marginLeft: '30px' }}
                                    />

                                    <div className={`loginButtons`} style={{ position: 'absolute', right: '40px', top: '20px', color: 'white'}}>

                                        <Group>
                                            <Anchor className={`contactUsLink`} href="https://www.ala.org.au/contact-us/" target="_blank"
                                                    sx={() => ({
                                                        '@media (max-width: 800px)': {
                                                            display: 'none'
                                                        },
                                                    })}
                                            >
                                                Contact us
                                            </Anchor>

                                            <Divider size="xs" orientation="vertical" style={{ borderLeft: '#808080 1px solid'}} />

                                        { currentUser ? (
                                            <>
                                                    <Button radius="xs" onClick={myProfile} variant="outline" size="md" compact sx={() => ({
                                                        '@media (max-width: 800px)': {
                                                            display: 'none'
                                                        },
                                                    })}>
                                                        <Text>
                                                            Profile - {currentUser?.user?.profile?.name} {currentUser?.isAdmin ? '(ADMIN)' : ''}
                                                        </Text>
                                                </Button>
                                                    <Button radius="xs" onClick={logout} variant="outline" size="md" compact sx={() => ({
                                                        '@media (max-width: 800px)': {
                                                            display: 'none'
                                                        },
                                                    })}>
                                                        <Text >Logout</Text>
                                                    </Button>
                                                    <Box  sx={() => ({
                                                        '@media (min-width: 800px)': {
                                                            display: 'none'
                                                        },
                                                    })}>
                                                        <IconLogout onClick={logout}/>
                                                    </Box>
                                            </>
                                        ) : (
                                                <>
                                                    <Group>
                                                        <Button radius="xs" onClick={signUp} size="md" compact sx={() => ({
                                                            '@media (max-width: 800px)': {
                                                                display: 'none'
                                                            },
                                                        })}>Sign up</Button>
                                                        <Button className={`loginButton`} radius="xs" onClick={() => void auth.signinRedirect()}
                                                                color="orange" size="md" compact sx={() => ({
                                                            '@media (max-width: 800px)': {
                                                                display: 'none'
                                                            },
                                                        })}>Login</Button>

                                                        <Box  sx={() => ({
                                                            '@media (min-width: 800px)': {
                                                                display: 'none'
                                                            },
                                                        })}>
                                                           <IconLogin onClick={() => void auth.signinRedirect()} />
                                                        </Box>

                                                    </Group>
                                                </>
                                        )}
                                        </Group>
                                    </div>

                                <Container
                                    style={{
                                        backgroundColor: '#E7E7E7',
                                        width: '100%',
                                        marginLeft: 0,
                                        marginRight: 0,
                                        paddingRight: 0,
                                        marginTop: '20px',
                                    }}
                                    size="100%"
                                >
                                    <Text style={{ padding: '16px 12px 16px 22px', color: '#000', paddingLeft: '22px' }}>
                                        <Breadcrumbs id={`breadcrumbs`} separator="&#x276F;" style={{ fontFamily: '"Roboto",sans-serif', fontSize: '14px' }}>
                                            {breadcrumbItems}
                                        </Breadcrumbs>
                                    </Text>
                                </Container>
                            </Container>
                        </Header>
                    </>
                }>

                <Space h="md" />
                <Routes>
                    <Route
                        path="/upload"
                        element={
                            <Publish />
                        }
                    />
                    <Route
                        path="/my-uploads"
                        element={
                            <MyPublishedDatasets />
                        }
                    />
                    <Route
                        path="/getting-started"
                        element={
                            <GettingStarted />
                        }
                    />
                    <Route
                        path="/api"
                        element={
                            <API />
                        }
                    />
                    <Route
                        path="/status/:requestID"
                        element={
                            <Status  />
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <Events />
                        }
                    />
                </Routes>
            </AppShell>
        </UserContext.Provider>
    );
}

