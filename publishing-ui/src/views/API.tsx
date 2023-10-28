import {Anchor, Image, Button, CopyButton, Grid, Group, Modal, Space, Text, Textarea, Title, Code} from "@mantine/core";
import Sidebar from "./Sidebar.tsx";
import {User} from "oidc-client-ts";
import {useEffect, useState} from "react";
import {useDisclosure} from "@mantine/hooks";
import { Prism } from '@mantine/prism';

export default function API() {

    const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);
    const [token, setToken] = useState('');
    const [opened, { open, close }] = useDisclosure(false);

    useEffect(() => {
        if (oidcStorage) {
            const user = User.fromStorageString(oidcStorage);
            if (!user.expired) {
                setToken(user?.access_token);
            }
        }
    }, []);

    const validate = `curl -X POST ${import.meta.env.VITE_APP_PUBLISH_URL}/validate
                -H "Authorization: Bearer $(cat /tmp/jwt.txt)"
                -F "file=@/tmp/my-darwin-core-archive.zip"`

    const publish = `curl -X POST ${import.meta.env.VITE_APP_PUBLISH_URL}/publish
                -H "Authorization: Bearer $(cat /tmp/jwt.txt)"
                -F "file=@/tmp/my-darwin-core-archive.zip"`

    const republish = `curl -X POST ${import.meta.env.VITE_APP_PUBLISH_URL}/publish/dr123
                -H "Authorization: Bearer $(cat /tmp/jwt.txt)"
                -F "file=@/tmp/my-darwin-core-archive.zip"`

    const unpublish = `curl -X DELETE ${import.meta.env.VITE_APP_PUBLISH_URL}/publish/dr123
                -H "Authorization: Bearer $(cat /tmp/jwt.txt)"`

    const publishWithParams = `curl -X POST ${import.meta.env.VITE_APP_PUBLISH_URL}/publish
                -H "Authorization: Bearer $(cat /tmp/jwt.txt)"
                -F "name=My dataset name"
                -F "description=My description of this dataset..."
                -F "licenceUrl=https://creativecommons.org/licenses/by/4.0/"
                -F "rights=My rights statement..."
                -F "citation=Please cite this data as..."
                -F "file=@/tmp/my-darwin-core-archive.zip"`;

    return <Grid mb="md">
        <Grid.Col xs={1} sm={2}>
            <Sidebar selected="api" />
        </Grid.Col>
        <Grid.Col xs={12} sm={10}>
            <Title order={3} size="h1">API access</Title>
            <Space h="lg"/>
            <Text>
                You access the Open API documentation for the API <Anchor href={import.meta.env.VITE_APP_PUBLISH_URL}>here</Anchor>.
            </Text>
            <Space h="xl"/>
            <Group >
                <Image maw={50} src="https://raw.githubusercontent.com/AtlasOfLivingAustralia/ala-labs/main/images/hex/galah_logo.png"
                       alt="Galah" />
                <Title order={3} size="h3">
                    galah - R and Python
                </Title>
            </Group>
            <Space h="lg"/>
            <Text>
                This API can access using the galah packages. Details to be added..
            </Text>

            <Space h="xl"/>
            <Title order={3} size="h3">Authentication</Title>
            <Space h="md"/>
            <Text>
                To use the publish and validation services, you need to supply a JWT.
            </Text>
            { token && <>
                <Text>
                   For testing, you can get your JWT by clicking the button below. Save this to a file
                    e.g. <Code>/tmp/jwt.txt</Code>

                </Text>
                <Text>
                    Note: these JWTs expire after 30 minutes.
                </Text>
                <Modal opened={opened} onClose={close} title="JSON Web Token (JWT)" centered size="xl" >
                    <Textarea autosize={true} maxRows={10}>
                        {token}
                    </Textarea>
                    <Space h="lg" />
                    <CopyButton value={token}>
                        {({ copied, copy }) => (
                            <Button onClick={copy} variant='outline'>
                                {copied ? 'Copied JWT' : 'Copy JWT to clipboard'}
                            </Button>
                        )}
                    </CopyButton>
                </Modal>
                <Space h="lg"/>
                <Group>
                    <Button variant='outline' onClick={open}>Show my JWT</Button>
                </Group>
            </>}

            <Space h="xl"/>
            <Title order={3} size="h4">DwCA Validation</Title>
            <Space h="lg"/>
            <Text>You can validate a DwCA like so:</Text>
            <Code maw={800} block><Prism language="bash">{validate}</Prism></Code>

            <Space h="xl"/>
            <Title order={3} size="h4">DwCA Publishing</Title>
            <Space h="lg"/>
            <Text>You can publish a DwCA like so:</Text>
            <Code maw={800} block><Prism language="bash">{publish}</Prism></Code>

            <Space h="xl"/>
            <Title order={3} size="h4">DwCA Publishing with additional parameters</Title>
            <Space h="lg"/>
            <Text>You can publish a DwCA and provide some metadata properties like so:</Text>
            <Code maw={800} block><Prism language="bash">{publishWithParams}</Prism></Code>

            <Space h="xl"/>
            <Title order={3} size="h4">DwCA Re-publishing</Title>
            <Space h="lg"/>
            <Text>You can republish a DwCA using the data resource ID e.g. dr123 like so:</Text>
            <Code maw={800} block><Prism language="bash">{republish}</Prism></Code>

            <Space h="xl"/>
            <Title order={3} size="h4">Un-publishing</Title>
            <Space h="lg"/>
            <Text>You can un-publish (delete) a DwCA using the data resource ID e.g. dr123 like so:</Text>
            <Code maw={800} block><Prism language="bash">{unpublish}</Prism></Code>

        </Grid.Col>
    </Grid>
}