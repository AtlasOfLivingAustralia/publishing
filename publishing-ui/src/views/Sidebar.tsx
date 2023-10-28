import {Accordion, Group, Text} from "@mantine/core";
import {Link} from "react-router-dom";
import {IconAccessPoint, IconHelp, IconHistory, IconHome, IconUpload} from "@tabler/icons-react";
import {useAuth} from "react-oidc-context";

interface SidebarProps {
    selected:string
}

export default function Sidebar({selected}:SidebarProps){

    const auth = useAuth();

    return <Accordion defaultValue={selected} style={{ backgroundColor: '#f6f6f6', borderRadius: '5px' }}>
        <Accordion.Item value="getting-started">
            <Link to={'/getting-started'}>
                <Accordion.Control>
                    <Group>
                        <IconHelp />
                        <Text>Getting started</Text>
                    </Group>
                </Accordion.Control>
            </Link>
        </Accordion.Item>
        <Accordion.Item value="upload">
            <Link to={'/upload'}>
                <Accordion.Control>
                    <Group>
                        <IconUpload/>
                        <Text>Publish dataset</Text>
                    </Group>
                </Accordion.Control>
            </Link>
        </Accordion.Item>
        {auth.user &&
            <Accordion.Item value="my-uploads">
                <Link to={'/my-uploads'}>
                    <Accordion.Control>
                        <Group>
                            <IconHome />
                            <Text>My datasets</Text>
                        </Group>
                    </Accordion.Control>
                </Link>
            </Accordion.Item>
        }
        <Accordion.Item value="history">
            <Link to={'/'}>
                <Accordion.Control>
                    <Group>
                        <IconHistory />
                        <Text>Recent events</Text>
                    </Group>
                </Accordion.Control>
            </Link>
        </Accordion.Item>

        <Accordion.Item value="api">
            <Link to={'/api'}>
                <Accordion.Control>
                    <Group>
                        <IconAccessPoint />
                        <Text>API access</Text>
                    </Group>
                </Accordion.Control>
            </Link>
        </Accordion.Item>
    </Accordion>
}