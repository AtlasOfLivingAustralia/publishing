import {Anchor, Grid, Space, Text, Title, Image} from "@mantine/core";
import {Link} from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import stepsImage from '../images/steps.png';

export default function GettingStarted() {
    return <Grid mb="md">
        <Grid.Col xs={1} sm={2}>
            <Sidebar selected="getting-started" />
        </Grid.Col>
        <Grid.Col xs={12} sm={10}>
            <Title order={3} size="h1">Publish your Darwin core archive</Title>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Getting Started Guide
            </Title>
            <Text>
                Darwin Core is a standard for sharing biodiversity data, and creating a <Anchor href={`https://dwc.tdwg.org/text/`}> Darwin Core Archive (DwC-A)</Anchor> allows you to package biodiversity data in a consistent format for sharing and publishing.
                Here's a step-by-step guide to help you get started with creating a Darwin Core Archive.
            </Text>
            <Image src={stepsImage} alt={`Darwin Core Archive`} maw={640} mx="auto"/>
            <Space h="md"/>
            <Title order={3} size="h4">
                Step 1: Download a template
            </Title>
            <Text>
                The Atlas has a set of templates you can access <Anchor href={`https://support.ala.org.au/helpdesk/attachments/6172807863`}> here </Anchor>to help you get started.
            </Text>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Step 2: Format dataset
            </Title>
            <Text>
                Familiarize yourself with Darwin Core standards and their specific terms.
                You can find detailed information about <Anchor href={`https://dwc.tdwg.org/terms/`}>Darwin Core terms</Anchor> and standards on the Atlas of Living Australia (ALA) website.
            </Text>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Step 3: Include metadata
            </Title>
            <Text>
                Create a metadata file (meta.xml) that describes your dataset. Include details like dataset title, description, creator information, and license. The metadata file provides essential context for understanding the data in your archive.
            </Text>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Step 4: Package into Darwin Core Archive (DwC-A)
            </Title>
            <Text>
                Package your data and metadata into a compressed ZIP file. Inside the ZIP file, include your data files in CSV format, along with the metadata file (meta.xml). Make sure your CSV files adhere to Darwin Core terms.
            </Text>
            <Space h="md"/>
            <Image
                alt="Darwin Core Archive"
                maw={640} mx="auto"
                src={`https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/6172725695/original/H7iYaUFWYwVe_r8P9tTR93UI0rr7Z6L4xg.png`}
            />
            <Space h="lg"/>
            <Title order={3} size="h4">
                Step 5: Publish Your Darwin Core Archive
            </Title>
            <Text>
                Use the ALA's <Link to={'/upload'}>publishing tools</Link> to upload and check the validity of your Darwin Core Archive. The validation process ensures that your data conforms to Darwin Core standards and is ready for sharing.
                <br/>
                Once your Darwin Core Archive is validated, you can publish it through the Atlas of Living Australia.
            </Text>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Seek Assistance
            </Title>
            <Text>
                If you encounter any issues or need further guidance, consult the help articles available in the <Anchor href={`https://support.ala.org.au/support/solutions/articles/6000261427-sharing-a-dataset-with-the-ala`}> Support section of the Atlas website.
                </Anchor>
            </Text>
            <Space h="lg"/>
            <Title order={3} size="h4">
                Helpful Links:
            </Title>
            <ul>
                <li>
                    <Anchor href={`https://support.ala.org.au/support/solutions/articles/6000261427-sharing-a-dataset-with-the-ala`}>
                        Atlas of Living Australia - Darwin Core Documentation
                    </Anchor>
                </li>
                <li>
                    <Anchor href={`https://dwc.tdwg.org/text/`}>
                        TDWG Darwin Core text guide
                    </Anchor>
                </li>
                <li>
                    <Anchor href={`https://www.gbif.org/darwin-core`}>
                        GBIF: What is Darwin Core, and why does it matter?
                    </Anchor>
                </li>
            </ul>
        </Grid.Col>
    </Grid>
}