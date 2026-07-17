import { Box, Group, Stack, Title } from "@mantine/core";
import classes from "./MainHeader.module.css";

interface MainHeaderProps {
  title: string;
}

export function MainHeader({ title }: Readonly<MainHeaderProps>) {
  return (
    <Box className={classes.headerContainer}>
      <Group
        justify="space-between"
        align="center"
        style={{ height: "100%" }}
        wrap="nowrap"
      >
        <Stack gap={0} style={{ overflow: "hidden", flex: 1 }}>
          <Title order={2} className={classes.title}>
            {title}
          </Title>
        </Stack>
      </Group>
    </Box>
  );
}

export default MainHeader;
